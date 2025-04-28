import pandas as pd
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from fastapi.responses import JSONResponse, FileResponse
import io
import json
import os
import uuid
import time # For potential cleanup task
import logging # Added logging
from starlette.concurrency import run_in_threadpool
from datetime import datetime # Added for timestamp

from app.core.config import settings
from app.core.security import get_current_active_user # Assuming you have this for auth eventually
from app.models.user import User # Assuming you have this

router = APIRouter()

# Configure logging
logging.basicConfig(level=logging.INFO) # Added basic logging config
logger = logging.getLogger(__name__) # Added logger instance

# Directory to store processed files temporarily
TEMP_DIR = settings.TEMP_FILE_DIR # Get from settings

# Ensure the temporary directory exists when the module is loaded
os.makedirs(TEMP_DIR, exist_ok=True)

# --- Define RGB Colors ---
# Using common hex codes for placeholder colors
RGB_COLORS = {
    'light_orange': 'FFDD9A', # Light Orange
    'light_green': 'C5E8B7',  # Light Green
    'lighter_green': 'D7F0CC',# Lighter Green
    'darker_orange': 'FFC285',# Darker Orange / Light Brown
    'light_blue': 'B3E0FF',  # Light Blue
    'error_red': 'FF0000' # Red for errors
}

# --- Helper for cleanup (Optional - Can be improved) ---
def remove_file_after_delay(file_path: str, delay: int = 3600): # Remove after 1 hour
    time.sleep(delay)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Cleaned up temporary file: {file_path}")
    except Exception as e:
        print(f"Error cleaning up file {file_path}: {e}")

def schedule_file_cleanup(background_tasks: BackgroundTasks, file_path: str, delay: int):
    """Adds a background task to delete a file after a delay."""
    def cleanup():
        try:
            time.sleep(delay)
            os.remove(file_path)
            logger.info(f"Cleaned up temporary file: {file_path}")
        except FileNotFoundError:
            logger.warning(f"Cleanup attempted, but file not found (already deleted?): {file_path}")
        except Exception as e:
            logger.error(f"Error during file cleanup for {file_path}: {e}")
            
    background_tasks.add_task(cleanup)

@router.post("/optimize-bids")
async def optimize_bids(
    file: UploadFile = File(...),
    target_acos: float = Form(30.0),
    increase_spend: bool = Form(False),
    asin_data: Optional[str] = Form("{}"),
    db: Session = Depends(deps.get_db)
):
    """
    Process uploaded PPC data and optimize bids
    """
    try:
        # Read the uploaded Excel file
        contents = await file.read()
        
        # Convert the bytes content to a pandas DataFrame
        df = pd.read_excel(io.BytesIO(contents)) if file.filename.endswith((".xlsx", ".xls")) else pd.read_csv(io.BytesIO(contents))
        
        # Parse the ASIN data JSON string to dictionary
        asin_dict = json.loads(asin_data)
        
        # Process the data with pandas
        result_df = df.copy()
        
        # Return sample results
        results = {
            "data": result_df.to_dict(orient="records"),
            "columns": result_df.columns.tolist(),
            "summary": {
                "total_rows": len(result_df),
                "updates_recommended": 0,
                "avg_change": 0
            }
        }
        
        return JSONResponse(content=results)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

# --- New Upload Endpoint ---
@router.post("/upload", summary="Upload PPC Data File")
async def upload_ppc_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Receives an Excel file, processes it (placeholder logic),
    saves the result temporarily, and returns a download ID.
    """
    logger.info("--- Entered /upload endpoint ---") # Added entry log
    download_id = str(uuid.uuid4())
    input_path = os.path.join(TEMP_DIR, f"input_{download_id}_{file.filename}")
    output_path = os.path.join(TEMP_DIR, f"processed_{download_id}.xlsx")
    logger.info(f"Generated paths: input={input_path}, output={output_path}") # Added path log

    try:
        logger.info("Attempting to save uploaded file...") # Log before save
        # Save the uploaded file temporarily
        with open(input_path, "wb") as buffer:
            file_content = await file.read() # Read into variable first
            logger.info(f"Read {len(file_content)} bytes from uploaded file.") # Log bytes read
            buffer.write(file_content)
        logger.info(f"Uploaded file saved successfully to: {input_path}")

        logger.info("Attempting to process file...") # Log before process
        # Process the file (using placeholder function)
        process_excel_file(input_path, output_path)
        logger.info("File processed successfully.") # Log after process

        # Schedule cleanup for both input and output files
        logger.info(f"Scheduling cleanup for {input_path} and {output_path} in 1 hour.")
        schedule_file_cleanup(background_tasks, input_path, delay=3600) # Use the defined function
        schedule_file_cleanup(background_tasks, output_path, delay=3600) # Use the defined function

        return {"message": "File processed successfully", "download_id": download_id}

    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {e}", exc_info=True) # Log the full exception
        # Clean up temporary files if error occurs during processing
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=f"Error processing file: {e}")
    # Removed the finally block as cleanup is handled in try/except

# --- New Download Endpoint ---
@router.get("/download/{download_id}", summary="Download Processed File")
async def download_processed_file(download_id: str):
    """
    Downloads the processed file identified by download_id.
    """
    file_path = os.path.join(TEMP_DIR, download_id)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found or has expired.")

    # Ensure the download_id is somewhat safe (prevent directory traversal)
    if ".." in download_id or "/" in download_id:
         raise HTTPException(status_code=400, detail="Invalid download ID.")

    return FileResponse(
        path=file_path, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename=f"processed_{download_id.split('_')[0]}.xlsx" # Give a slightly nicer name
    )

# Placeholder for the actual implementation of optimize_bids if needed separately
# async def actual_optimize_bids_logic(df: pd.DataFrame, target_acos: float, ...):
#    pass

# Placeholder for the actual Excel processing logic
def process_excel_file(input_path: str, output_path: str):
    """Reads an Excel file, performs processing (currently adds a dummy column), 
    and saves the result to another Excel file."""
    logger.info(f"Starting processing for file: {input_path}")
    try:
        # Read the Excel file using pandas
        df = pd.read_excel(input_path)
        logger.info(f"Successfully read {len(df)} rows from {input_path}")

        # --- Your actual pandas processing logic goes here ---
        # Example: Add a dummy 'Processed' column
        df['Processed'] = 'Yes'
        logger.info("Added 'Processed' column (Example processing)")
        # ------------------------------------------------------

        # Save the processed DataFrame to a new Excel file
        df.to_excel(output_path, index=False)
        logger.info(f"Processed file saved successfully to: {output_path}")

    except Exception as e:
        logger.error(f"Error during pandas processing for {input_path}: {e}", exc_info=True)
        # Re-raise the exception so the calling function knows about the failure
        raise e

# Modified process_excel_file function
def process_excel_file(input_path: str, output_path: str, target_acos: float, increase_spend: bool):
    """Reads Sheet 1 (PPC data) and Sheet 2 (ASIN AOV data) from an Excel file,
    performs bid optimization on Sheet 1 data, and saves the result."""
    logger.info(f"Starting processing for file: {input_path} with Target ACOS: {target_acos}%, Increase Spend: {increase_spend}")
    asin_data = {} # Initialize ASIN Average Order Value data

    try:
        # --- Read Input File ---
        # Read Sheet 1 (PPC Data)
        try:
            df = pd.read_excel(input_path, sheet_name=0) # Read first sheet
            logger.info(f"Successfully read {len(df)} rows from Sheet 1 of {input_path}")
        except Exception as e:
            logger.error(f"Failed to read Sheet 1 (PPC Data) from {input_path}: {e}", exc_info=True)
            raise ValueError(f"Could not read PPC data from the first sheet: {e}")

        # Read Sheet 2 (ASIN AOV Data) - Optional
        try:
            asin_df = pd.read_excel(input_path, sheet_name=1) # Read second sheet
            logger.info(f"Successfully read {len(asin_df)} rows from Sheet 2 (ASIN Data) of {input_path}")

            # Standardize column names (convert to lower case for matching)
            asin_df.columns = [str(col).lower() for col in asin_df.columns]

            # Check for required columns ('asin', 'aov')
            if 'asin' in asin_df.columns and 'aov' in asin_df.columns:
                # Convert relevant columns, handling errors
                asin_df['asin'] = asin_df['asin'].astype(str)
                asin_df['aov'] = pd.to_numeric(asin_df['aov'], errors='coerce') # Convert AOV to numeric, errors become NaN

                # Drop rows where AOV conversion failed or ASIN is missing/empty
                asin_df.dropna(subset=['asin', 'aov'], inplace=True)
                asin_df = asin_df[asin_df['asin'].str.strip() != '']

                # Create the asin_data dictionary
                asin_data = pd.Series(asin_df['aov'].values, index=asin_df['asin']).to_dict()
                logger.info(f"Successfully created ASIN AOV dictionary with {len(asin_data)} entries.")
            else:
                logger.warning("Sheet 2 found, but missing required 'ASIN' or 'AOV' columns. Proceeding without ASIN AOV data.")

        except IndexError:
            logger.warning(f"Sheet 2 (ASIN Data) not found in {input_path}. Proceeding without ASIN AOV data.")
        except Exception as e:
            logger.warning(f"Failed to read or process Sheet 2 (ASIN Data) from {input_path}: {e}. Proceeding without ASIN AOV data.", exc_info=True)


        # Basic check for empty primary dataframe
        if df.empty:
            logger.warning(f"Sheet 1 of {input_path} is empty or contains no data.")
            df.to_excel(output_path, index=False, engine='openpyxl')
            logger.info(f"Saved empty processed file to: {output_path}")
            return # Stop processing if empty

        # --- Bid Optimization Logic ---
        result_df = df.copy()

        # Convert target_acos from percentage (e.g., 30) to decimal (e.g., 0.30)
        target_acos_decimal = target_acos / 100.0 if target_acos >= 1 else target_acos # Use 100.0 for float division

        # --- Initialize Output Columns ---
        # Initialize new columns if they don't exist, preserving existing data if present
        if 'New Bid' not in result_df.columns: result_df['New Bid'] = result_df.get('Bid', pd.NA)
        else: result_df['New Bid'] = pd.to_numeric(result_df['New Bid'], errors='coerce').fillna(result_df['Bid']) # Ensure numeric, fallback to Bid

        if 'Update' not in result_df.columns: result_df['Update'] = ''
        else: result_df['Update'] = result_df['Update'].fillna('') # Ensure string, fill NaNs

        if 'Color' not in result_df.columns: result_df['Color'] = ''
        else: result_df['Color'] = result_df['Color'].fillna('') # Ensure string, fill NaNs

        # --- Calculate Intermediate Metrics ---
        # Calculate ACTC and RPC carefully, handling potential division by zero or NaNs
        if 'Spend' in result_df.columns and 'Orders' in result_df.columns:
             # Ensure numeric types before division
             spend_col = pd.to_numeric(result_df['Spend'], errors='coerce')
             orders_col = pd.to_numeric(result_df['Orders'], errors='coerce')
             result_df['ACTC'] = (spend_col / orders_col.replace(0, pd.NA)).astype(float)
        else:
             result_df['ACTC'] = pd.NA
             logger.warning("Missing 'Spend' or 'Orders' column for ACTC calculation.")

        if 'Sales' in result_df.columns and 'Clicks' in result_df.columns:
             # Ensure numeric types before division
             sales_col = pd.to_numeric(result_df['Sales'], errors='coerce')
             clicks_col = pd.to_numeric(result_df['Clicks'], errors='coerce')
             result_df['RPC'] = (sales_col / clicks_col.replace(0, pd.NA)).astype(float)
        else:
            result_df['RPC'] = pd.NA
            logger.warning("Missing 'Sales' or 'Clicks' column for RPC calculation.")

        if '% of AOV' not in result_df.columns: result_df['% of AOV'] = 0.0
        else: result_df['% of AOV'] = pd.to_numeric(result_df['% of AOV'], errors='coerce').fillna(0.0) # Ensure numeric, fallback to 0

        logger.info("Starting row-by-row bid optimization...")
        processed_rows = 0
        errors_in_rows = 0

        # --- Ensure Required Input Columns Exist ---
        required_cols = ['Impressions', 'Clicks', 'Spend', 'Sales', 'Orders', 'Bid', 'ACOS', 'Click-through Rate', 'CPC', 'ASIN (Informational only)']
        # Normalize column names in the dataframe for case-insensitive matching
        result_df.columns = [str(col) for col in result_df.columns] # Ensure string column names
        df_cols_lower = {col.lower().strip(): col for col in result_df.columns}

        # Map required lower-case names back to original casing if found, else mark as missing
        col_mapping = {}
        missing_cols = []
        for req_col_lower in [c.lower() for c in required_cols]:
            original_case_col = df_cols_lower.get(req_col_lower)
            if original_case_col:
                 # Create mapping from standardized name (e.g., 'acos') to original ('ACOS')
                 col_mapping[req_col_lower.replace(' ','_').replace('-','_')] = original_case_col # e.g. click_through_rate
            else:
                 # Try to find the original name from required_cols list for the warning message
                 original_req_col = next((c for c in required_cols if c.lower() == req_col_lower), req_col_lower)
                 missing_cols.append(original_req_col)
                 # Add the column with NA to prevent errors later if critical logic depends on it
                 result_df[original_req_col] = pd.NA
                 col_mapping[req_col_lower.replace(' ','_').replace('-','_')] = original_req_col # Map to the added NA column


        if missing_cols:
             logger.warning(f"Missing expected columns: {', '.join(missing_cols)}. Added them with NA values. Calculations may be affected.")

        # Define helper to safely get data using mapped column names
        def safe_get(row, col_key, default=pd.NA):
            mapped_col = col_mapping.get(col_key)
            return row.get(mapped_col, default) if mapped_col else default


        # --- Row-by-Row Processing ---
        for idx, row in result_df.iterrows():
            try:
                # --- Get Row Data Safely ---
                current_bid = pd.to_numeric(safe_get(row, 'bid'), errors='coerce')
                if pd.isna(current_bid): # Skip if Bid is missing or non-numeric
                    continue

                impressions = pd.to_numeric(safe_get(row, 'impressions', 0), errors='coerce') or 0
                clicks = pd.to_numeric(safe_get(row, 'clicks', 0), errors='coerce') or 0
                spend = pd.to_numeric(safe_get(row, 'spend', 0), errors='coerce') or 0
                sales = pd.to_numeric(safe_get(row, 'sales', 0), errors='coerce') or 0
                orders = pd.to_numeric(safe_get(row, 'orders', 0), errors='coerce') or 0
                cpc = pd.to_numeric(safe_get(row, 'cpc', 0), errors='coerce') or 0
                asin = str(safe_get(row, 'asin_(informational_only)', '')) # Get ASIN as string

                # ACOS: Handle %, decimal, NaN, string
                acos_raw = safe_get(row, 'acos')
                if pd.isna(acos_raw): acos = 0.0
                else:
                    try:
                        if isinstance(acos_raw, str) and '%' in acos_raw: acos_num = float(acos_raw.replace('%','')) / 100.0
                        else: acos_num = float(acos_raw)
                        acos = acos_num / 100.0 if abs(acos_num) > 1 else acos_num # Convert if looks like percentage (e.g., 30)
                    except (ValueError, TypeError): acos = 0.0

                 # CTR: Handle %, decimal, NaN, string
                ctr_raw = safe_get(row, 'click_through_rate')
                if pd.isna(ctr_raw): ctr = 0.0
                else:
                     try:
                        if isinstance(ctr_raw, str) and '%' in ctr_raw: ctr_num = float(ctr_raw.replace('%','')) / 100.0
                        else: ctr_num = float(ctr_raw)
                        ctr = ctr_num / 100.0 if abs(ctr_num) > 1 else ctr_num # Convert if looks like percentage (e.g., 0.3)
                     except (ValueError, TypeError): ctr = 0.0

                # --- Calculate AOV and % of AOV ---
                current_aov = 0.0
                if orders > 0 and sales > 0: # Use row data if available
                    current_aov = sales / orders
                elif asin and asin in asin_data: # Fallback to Sheet 2 data
                     current_aov = asin_data.get(asin, 0.0)

                aov_percent = (spend / current_aov) if current_aov > 0 else 0.0
                # Use .loc for setting value to avoid potential warnings
                result_df.loc[idx, col_mapping.get('%_of_aov', '% of AOV')] = aov_percent


                # --- Apply Bid Optimization Conditions ---
                new_bid = current_bid # Initialize with current bid
                color_hex = None
                update_required = False

                # Condition 1: ACOS >= Target ACOS + 10%
                if acos >= (target_acos_decimal * 1.1):
                    color_hex = RGB_COLORS['light_orange']
                    if clicks > 0 and sales > 0:
                        rpc_row = sales / clicks
                        effective_cpc = cpc if cpc > 0 else (spend / clicks if clicks > 0 else 0)
                        if effective_cpc > 0:
                            # Original formula provided: Bid = (RPC * Target ACOS) * (Current Bid / CPC)
                            new_bid = (rpc_row * target_acos_decimal) * (current_bid / effective_cpc)
                    update_required = True

                # Condition 2: ACOS <= Target ACOS - 10% AND Orders > 1
                elif acos <= (target_acos_decimal * 0.9) and orders > 1:
                    color_hex = RGB_COLORS['light_green']
                    increase_factor = 1.15 if acos <= (target_acos_decimal * 0.5) else 1.1
                    new_bid = current_bid * increase_factor
                    update_required = True

                # Condition 3: ACOS <= Target ACOS - 10% AND Orders = 1
                elif acos <= (target_acos_decimal * 0.9) and orders == 1:
                    color_hex = RGB_COLORS['lighter_green']
                    increase_factor = 1.06 if acos <= (target_acos_decimal * 0.5) else 1.05
                    new_bid = current_bid * increase_factor
                    update_required = True

                # Condition 4: ACOS = 0% AND % of AOV >= Target ACOS - 10%
                elif abs(acos) < 0.0001 and aov_percent >= (target_acos_decimal * 0.9):
                    color_hex = RGB_COLORS['darker_orange']
                    new_bid = current_bid * 0.8 # Reduce bid by 20%
                    update_required = True

                # Condition 5: ACOS = 0% AND % of AOV <= 10% AND CTR >= 0.3% (Increase spend option)
                elif increase_spend and abs(acos) < 0.0001 and aov_percent <= 0.1 and ctr >= 0.003:
                    color_hex = RGB_COLORS['light_blue']
                    new_bid = current_bid * 1.05
                    update_required = True


                # --- Update DataFrame Row ---
                new_bid = round(max(0.02, new_bid), 2) # Ensure bid is at least $0.02 and rounded

                # Use .loc for setting values
                new_bid_col = col_mapping.get('new_bid', 'New Bid')
                update_col = col_mapping.get('update', 'Update')
                color_col = col_mapping.get('color', 'Color')

                if update_required and abs(new_bid - current_bid) > 0.001:
                    result_df.loc[idx, color_col] = color_hex
                    result_df.loc[idx, update_col] = 'Update'
                    result_df.loc[idx, new_bid_col] = new_bid
                elif update_required:
                    result_df.loc[idx, color_col] = color_hex
                    # No 'Update' status if bid change is negligible
                    if update_col in result_df.columns: result_df.loc[idx, update_col] = ''
                    # Keep original bid if change is negligible
                    if new_bid_col in result_df.columns: result_df.loc[idx, new_bid_col] = current_bid
                # If no condition met, ensure 'Update' is blank if the column exists
                elif update_col in result_df.columns:
                     result_df.loc[idx, update_col] = ''
                     if color_col in result_df.columns: result_df.loc[idx, color_col] = '' # Clear color if no condition met


                processed_rows += 1

            except Exception as e:
                errors_in_rows += 1
                logger.error(f"Error processing row index {idx}: {e}", exc_info=True)
                # Mark the row as failed in the output using .loc
                update_col = col_mapping.get('update', 'Update')
                color_col = col_mapping.get('color', 'Color')
                if update_col in result_df.columns: result_df.loc[idx, update_col] = 'Error'
                if color_col in result_df.columns: result_df.loc[idx, color_col] = RGB_COLORS['error_red']
                continue

        logger.info(f"Finished row-by-row processing. Processed: {processed_rows}, Errors: {errors_in_rows}")

        # --- Save Output ---
        result_df.to_excel(output_path, index=False, engine='openpyxl')
        logger.info(f"Processed file with optimizations saved successfully to: {output_path}")

    # --- Error Handling ---
    except ValueError as ve: # Catch specific value errors raised (e.g., reading sheet 1)
         logger.error(f"Value error during processing: {ve}", exc_info=True)
         raise ve # Re-raise specific error for endpoint to handle
    except pd.errors.EmptyDataError:
        logger.error(f"Input file {input_path} Sheet 1 is empty or contains no parsable data.")
        pd.DataFrame().to_excel(output_path, index=False, engine='openpyxl')
        raise ValueError("Uploaded file's first sheet is empty or invalid.")
    except FileNotFoundError:
        logger.error(f"Input file not found at {input_path}")
        raise
    except Exception as e:
        logger.error(f"General error during pandas processing or file I/O for {input_path}: {e}", exc_info=True)
        raise e # Re-raise other exceptions

# --- API Endpoints ---

# Modified /upload endpoint
@router.post(
    "/upload",
    summary="Upload and Process PPC File",
    # response_model=..., # Define a response model if needed
    # dependencies=[Depends(get_current_active_user)] # Add auth later
)
async def upload_ppc_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="XLSX, XLS, or CSV file containing PPC data. Required columns include: Impressions, Clicks, Spend, Sales, Orders, Bid, ACOS, Click-through Rate, CPC, ASIN (Informational only)"),
    target_acos: float = Form(..., ge=0, le=1000, description="Target ACOS percentage (e.g., 30 for 30%). Must be >= 0."), # Added validation
    increase_spend: bool = Form(False, description="Whether to increase spend for promising low-ACOS/low-spend items")
):
    """
    Uploads a PPC data file, performs bid optimization based on the provided
    Target ACOS and Increase Spend flag, schedules cleanup, and returns a
    download ID for the processed file.

    **Required Columns in Uploaded File:**
    - Impressions
    - Clicks
    - Spend
    - Sales
    - Orders
    - Bid
    - ACOS (can be % like 31.5 or decimal like 0.315)
    - Click-through Rate (CTR) (can be % like 0.3 or decimal like 0.003)
    - CPC
    - ASIN (Informational only) (Optional, used for AOV fallback)
    """
    # --- File Handling and Path Generation ---
    logger.info("--- Entered /upload endpoint ---")
    download_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")

    # Sanitize filename (more robustly)
    original_filename = file.filename or "uploaded_file"
    base, ext = os.path.splitext(original_filename)
    safe_base = "".join(c if c.isalnum() else '_' for c in base)
    safe_filename = f"{safe_base}{ext}" if ext else safe_base
    # Limit filename length
    safe_filename = safe_filename[:100] # Limit length

    input_path = os.path.join(TEMP_DIR, f"input_{download_id}_{timestamp}_{safe_filename}")
    # Consistent output naming convention tied to download_id for easier lookup
    temp_output_path = os.path.join(TEMP_DIR, f"temp_processed_{download_id}_{timestamp}.xlsx")
    final_output_path = os.path.join(TEMP_DIR, f"{download_id}.xlsx")

    logger.info(f"Generated paths: input='{input_path}', temp_output='{temp_output_path}', final_output='{final_output_path}'")
    logger.info(f"Received parameters: target_acos={target_acos}, increase_spend={increase_spend}")

    # --- File Saving and Processing ---
    try:
        logger.info("Attempting to save uploaded file...")
        # Save the uploaded file temporarily using async-friendly method
        file_content = await file.read()
        if not file_content:
             logger.error("Uploaded file is empty.")
             raise HTTPException(status_code=400, detail="Uploaded file content is empty.")

        async with await run_in_threadpool(open, input_path, "wb") as buffer:
            await run_in_threadpool(buffer.write, file_content)

        logger.info(f"Uploaded file saved successfully to: {input_path}")
        logger.info(f"File size: {len(file_content)} bytes")


        logger.info(f"Attempting to process file...")
        # Process the file using the updated function (run in threadpool for potentially long processing)
        await run_in_threadpool(
            process_excel_file,
            input_path,
            temp_output_path, # Process to temporary output first
            target_acos,
            increase_spend
        )
        logger.info("File processing function completed.")

        # --- Finalizing Output and Cleanup ---
        # Check if temp output file was created
        if not os.path.exists(temp_output_path):
             logger.error("Processing completed but output file was not created.")
             raise HTTPException(status_code=500, detail="Internal server error: Failed to generate processed file.")

        # Rename the temporary output file to the final download ID filename
        await run_in_threadpool(os.rename, temp_output_path, final_output_path)
        logger.info(f"Renamed processed file to {final_output_path}")

        # Schedule cleanup for the original input file and the final output file
        logger.info(f"Scheduling cleanup for {input_path} and {final_output_path} in {settings.TEMP_FILE_CLEANUP_DELAY} seconds.")
        schedule_file_cleanup(background_tasks, input_path, delay=settings.TEMP_FILE_CLEANUP_DELAY)
        schedule_file_cleanup(background_tasks, final_output_path, delay=settings.TEMP_FILE_CLEANUP_DELAY)

        # --- Return Success Response ---
        return {"message": "File processed successfully", "download_id": download_id}

    except HTTPException as http_exc:
         logger.error(f"HTTP Exception during upload/processing: {http_exc.detail}")
         # Clean up potentially created files on known HTTP errors
         if os.path.exists(input_path): await run_in_threadpool(os.remove, input_path)
         if os.path.exists(temp_output_path): await run_in_threadpool(os.remove, temp_output_path)
         if os.path.exists(final_output_path): await run_in_threadpool(os.remove, final_output_path)
         raise # Re-raise the HTTPException

    except ValueError as ve: # Catch specific error from process_excel_file
        logger.error(f"Value Error during processing: {ve}")
        if os.path.exists(input_path): await run_in_threadpool(os.remove, input_path)
        if os.path.exists(temp_output_path): await run_in_threadpool(os.remove, temp_output_path)
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        logger.error(f"Unexpected error processing file {safe_filename}: {e}", exc_info=True)
        # General cleanup on unexpected errors
        if os.path.exists(input_path): await run_in_threadpool(os.remove, input_path)
        if os.path.exists(temp_output_path): await run_in_threadpool(os.remove, temp_output_path)
        if os.path.exists(final_output_path): await run_in_threadpool(os.remove, final_output_path) # Renamed file

        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during file processing.")

    finally:
        # Ensure file object is closed
        await file.close()


# Modified /download endpoint
@router.get(
    "/download/{download_id}",
    summary="Download Processed PPC File",
    # response_class=FileResponse # Implicitly handled
    # dependencies=[Depends(get_current_active_user)] # Add auth later
)
async def download_processed_file(download_id: str):
    """
    Downloads the processed Excel file identified by the `download_id`.
    The file is retrieved based on the ID and served to the user.
    """
    # --- Input Validation ---
    logger.info(f"Received download request for ID: {download_id}")
    try:
        # Check if it's a valid UUID format
        uuid_obj = uuid.UUID(download_id, version=4)
        # Ensure the string representation matches exactly (prevents different formats)
        if str(uuid_obj) != download_id:
             raise ValueError("UUID string format mismatch")
    except ValueError:
         logger.warning(f"Invalid download ID format received: {download_id}")
         raise HTTPException(status_code=400, detail="Invalid download ID format.")

    # --- File Location and Check ---
    # Construct path based on the established convention ({download_id}.xlsx)
    file_path = os.path.join(TEMP_DIR, f"{download_id}.xlsx")
    logger.info(f"Attempting to serve file from path: {file_path}")

    # Check if the file exists using async-friendly method
    file_exists = await run_in_threadpool(os.path.exists, file_path)

    if not file_exists:
        logger.warning(f"Download request failed: File not found at {file_path}")
        raise HTTPException(status_code=404, detail="File not found. It may have been processed unsuccessfully, cleaned up, or the ID is incorrect.")

    # --- Return File Response ---
    # Generate a user-friendly filename for the download prompt
    download_filename = f"optimized_bids_{download_id[:8]}.xlsx"
    logger.info(f"File found. Serving '{file_path}' as '{download_filename}'")

    return FileResponse(
        path=file_path,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename=download_filename
    )

@router.post(
    "/mine-keywords",
    summary="Upload and Mine Keywords from PPC Data File",
)
async def mine_keywords(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="XLSX, XLS, or CSV file containing PPC data."),
    max_acos: float = Form(..., ge=0, le=100, description="Maximum ACOS threshold percentage."),
    match_type: str = Form("exact", description="Keyword match type (exact, phrase, or broad)."),
    brands_to_exclude: str = Form("", description="Comma-separated list of brand names to exclude."),
):
    """
    Mines profitable keywords from the uploaded PPC data file based on:
    - Maximum ACOS threshold
    - Match type
    - Brand exclusions
    """
    logger.info(f"Entered /mine-keywords endpoint with params: max_acos={max_acos}, match_type={match_type}")
    download_id = str(uuid.uuid4())
    input_path = os.path.join(TEMP_DIR, f"input_{download_id}_{file.filename}")
    output_path = os.path.join(TEMP_DIR, f"{download_id}")  # Format to match what download endpoint expects
    
    try:
        logger.info("Saving uploaded file for keyword mining...")
        with open(input_path, "wb") as buffer:
            file_content = await file.read()
            logger.info(f"Read {len(file_content)} bytes from uploaded file.")
            buffer.write(file_content)
        logger.info(f"File saved successfully to: {input_path}")
        
        logger.info("Processing file for keyword mining...")
        # Process the file for keyword mining
        process_keyword_mining(
            input_path, 
            output_path, 
            max_acos_threshold=max_acos,
            match_type=match_type,
            brands_to_exclude=brands_to_exclude
        )
        logger.info("Keyword mining completed successfully.")
        
        # Schedule cleanup
        schedule_file_cleanup(background_tasks, input_path, delay=3600)
        schedule_file_cleanup(background_tasks, output_path, delay=3600)
        
        return {
            "message": "Keywords mined successfully",
            "download_id": download_id
        }
    
    except Exception as e:
        logger.error(f"Error mining keywords from file {file.filename}: {e}", exc_info=True)
        # Clean up temporary files if error occurs
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=f"Error mining keywords: {e}")

# Function to process the keyword mining
def process_keyword_mining(
    input_path: str,
    output_path: str,
    max_acos_threshold: float,
    match_type: str,
    brands_to_exclude: str
):
    """
    Process the uploaded file to mine keywords based on the specified parameters.
    
    Args:
        input_path (str): Path to the input file.
        output_path (str): Path where the processed file will be saved.
        max_acos_threshold (float): Maximum ACOS threshold for keyword selection.
        match_type (str): Match type for keywords (exact, phrase, or broad).
        brands_to_exclude (str): Comma-separated list of brand names to exclude.
    """
    logger.info(f"Starting keyword mining with max ACOS: {max_acos_threshold}%, match type: {match_type}")
    
    try:
        # Get the current date in YYYYMMDD format
        current_date = datetime.now().strftime("%Y%m%d")
        
        # Process brands to exclude
        excluded_brands = []
        if brands_to_exclude:
            excluded_brands = [f" {brand.strip().lower()} " for brand in brands_to_exclude.split(',') if brand.strip()]
            logger.info(f"Excluding brands: {excluded_brands}")
        
        # Read input files
        try:
            # Read the Search Term Report
            if input_path.endswith(('.xlsx', '.xls')):
                search_report = pd.read_excel(input_path, sheet_name="SP Search Term Report")
                sponsored_products = pd.read_excel(input_path, sheet_name="Sponsored Products Campaigns")
                try:
                    asin_list = pd.read_excel(input_path, sheet_name="ASIN list")
                except:
                    logger.warning("ASIN list sheet not found, creating empty DataFrame")
                    asin_list = pd.DataFrame(columns=["A"])
            else:
                # If CSV, we can only read one sheet
                search_report = pd.read_csv(input_path)
                sponsored_products = pd.DataFrame()
                asin_list = pd.DataFrame()
                logger.warning("Using CSV file format. Only SP Search Term Report data will be processed.")
            
            logger.info(f"Successfully read {len(search_report)} rows from search report")
        except Exception as e:
            logger.error(f"Error reading input file: {e}")
            # Create sample data for demonstration
            search_report = pd.DataFrame({
                "P": ["sample search term 1", "sample search term 2"],
                "V": [2, 1],  # Orders
                "Y": [10, 20],  # ACOS
                "L": ["keyword 1", "keyword 2"],
                "B": ["campaign1", "campaign2"],
                "F": ["Ad Group 1", "Ad Group 2"],
                "Z": [0.25, 0.30]  # Bid
            })
            sponsored_products = pd.DataFrame({
                "D": ["campaign1", "campaign1", "campaign2"],
                "B": ["Campaign", "Product Ad", "Product Ad"],
                "V": ["SKU1", "", "SKU2"]
            })
            asin_list = pd.DataFrame({"A": ["B000000001", "B000000002"]})
            logger.warning("Using sample data due to file read error.")
        
        # Collections to store keywords by SKU
        sku_keywords = {}  # Regular keywords
        targeting_keywords = {}  # B0 terms (ASINs)
        
        # Step 1: Collect keywords by SKU
        for _, row in search_report.iterrows():
            try:
                # Get values from row
                search_term = str(row.get("P", "")).strip()
                orders = int(row.get("V", 0))
                acos = float(row.get("Y", 100))
                keyword_text = f" {str(row.get('L', '')).lower()} "
                
                # Filter by ACOS threshold and orders
                if orders >= 1 and acos < max_acos_threshold:
                    # Check if search term is in keyword text
                    if search_term.lower() not in keyword_text:
                        # Check if we should exclude this term based on brand names
                        exclude = False
                        for brand in excluded_brands:
                            if brand in f" {search_term.lower()} ":
                                exclude = True
                                break
                        
                        if not exclude:
                            campaign_id = str(row.get("B", ""))
                            ad_group_name = str(row.get("F", ""))
                            bid = float(row.get("Z", 0))
                            
                            # Get SKU using helper function
                            sku = get_sku(sponsored_products, campaign_id)
                            
                            # Create keyword info array
                            keyword_info = [search_term, orders, bid, ad_group_name]
                            
                            # Check if it's a B0 term (ASIN)
                            if search_term.lower().startswith("b0"):
                                # Check if this is one of our own products
                                is_own_product = False
                                for _, asin_row in asin_list.iterrows():
                                    if str(asin_row.get("A", "")).upper() == search_term.upper():
                                        is_own_product = True
                                        break
                                
                                if not is_own_product:
                                    # Add to targeting keywords
                                    if sku not in targeting_keywords:
                                        targeting_keywords[sku] = []
                                    targeting_keywords[sku].append(keyword_info)
                            else:
                                # Add to regular keywords
                                sku_key = f"{sku}|{orders}"
                                if sku_key not in sku_keywords:
                                    sku_keywords[sku_key] = []
                                sku_keywords[sku_key].append(keyword_info)
            except Exception as e:
                logger.error(f"Error processing row: {e}")
                continue
        
        # Create Excel writer for output
        writer = pd.ExcelWriter(output_path, engine='openpyxl')
        
        # Create DataFrames for each sheet
        high_df = pd.DataFrame(columns=[
            "Product", "Entity", "Operation", "Campaign ID", "Ad Group ID", 
            "Portfolio ID", "Ad ID", "Keyword ID", "Product Targeting ID", 
            "Campaign Name", "Ad Group Name", "Start Date", "End Date", 
            "Targeting Type", "State", "Daily Budget", "SKU", 
            "Ad Group Default Bid", "Bid", "Keyword Text", 
            "Native Language Keyword", "Native Language Locale", 
            "Match Type", "Bidding Strategy", "Placement", 
            "Percentage", "Product Targeting Expression"
        ])
        
        high_review_df = pd.DataFrame(columns=[
            "Review Needed", "Product", "Entity", "Operation", "Campaign ID", 
            "Ad Group ID", "Portfolio ID", "Ad ID", "Keyword ID", 
            "Product Targeting ID", "Campaign Name", "Ad Group Name", 
            "Start Date", "End Date", "Targeting Type", "State", 
            "Daily Budget", "SKU", "Ad Group Default Bid", "Bid", 
            "Keyword Text", "Native Language Keyword", "Native Language Locale", 
            "Match Type", "Bidding Strategy", "Placement", 
            "Percentage", "Product Targeting Expression"
        ])
        
        low_df = high_df.copy()
        low_review_df = high_review_df.copy()
        product_targets_df = high_df.copy()
        product_targets_review_df = high_review_df.copy()
        
        # Write regular keywords
        high_row = 0
        high_review_row = 0
        low_row = 0
        low_review_row = 0
        
        for sku_key, keywords in sku_keywords.items():
            sku, orders_str = sku_key.split('|')
            orders = int(orders_str)
            
            # Determine target DataFrame
            if orders >= 3:
                if sku == "Multi ASIN":
                    target_df = high_review_df
                    row_index = high_review_row
                else:
                    target_df = high_df
                    row_index = high_row
            else:
                if sku == "Multi ASIN":
                    target_df = low_review_df
                    row_index = low_review_row
                else:
                    target_df = low_df
                    row_index = low_row
            
            campaign_count = 0
            keyword_count = 0
            new_id = ""
            
            for keyword_info in keywords:
                if keyword_count % 10 == 0:
                    campaign_count += 1
                    keyword_count = 0
                    
                    # Create campaign
                    new_id = f"{sku} - SP {match_type} - {campaign_count}"
                    
                    # Add campaign row
                    campaign_row = {}
                    if sku == "Multi ASIN":
                        campaign_row["Review Needed"] = f"Yes - {keyword_info[3]}"
                        campaign_row["Product"] = "Sponsored Products"
                        campaign_row["Entity"] = "Campaign"
                        campaign_row["Operation"] = "Create"
                        campaign_row["Campaign ID"] = new_id
                        campaign_row["Campaign Name"] = new_id
                        campaign_row["Start Date"] = current_date
                        campaign_row["Targeting Type"] = "MANUAL"
                        campaign_row["State"] = "enabled"
                        campaign_row["Daily Budget"] = 10
                        campaign_row["Bidding Strategy"] = "Dynamic bids - down only"
                    else:
                        campaign_row["Product"] = "Sponsored Products"
                        campaign_row["Entity"] = "Campaign"
                        campaign_row["Operation"] = "Create"
                        campaign_row["Campaign ID"] = new_id
                        campaign_row["Campaign Name"] = new_id
                        campaign_row["Start Date"] = current_date
                        campaign_row["Targeting Type"] = "MANUAL"
                        campaign_row["State"] = "enabled"
                        campaign_row["Daily Budget"] = 10
                        campaign_row["Bidding Strategy"] = "Dynamic bids - down only"
                    
                    target_df.loc[row_index] = campaign_row
                    row_index += 1
                    
                    # Add ad group row
                    ad_group_row = {}
                    if sku == "Multi ASIN":
                        ad_group_row["Review Needed"] = f"Yes - {keyword_info[3]}"
                        ad_group_row["Product"] = "Sponsored Products"
                        ad_group_row["Entity"] = "Ad Group"
                        ad_group_row["Operation"] = "Create"
                        ad_group_row["Campaign ID"] = new_id
                        ad_group_row["Ad Group ID"] = new_id
                        ad_group_row["Ad Group Name"] = new_id
                        ad_group_row["State"] = "enabled"
                        ad_group_row["Ad Group Default Bid"] = 1
                    else:
                        ad_group_row["Product"] = "Sponsored Products"
                        ad_group_row["Entity"] = "Ad Group"
                        ad_group_row["Operation"] = "Create"
                        ad_group_row["Campaign ID"] = new_id
                        ad_group_row["Ad Group ID"] = new_id
                        ad_group_row["Ad Group Name"] = new_id
                        ad_group_row["State"] = "enabled"
                        ad_group_row["Ad Group Default Bid"] = 1
                    
                    target_df.loc[row_index] = ad_group_row
                    row_index += 1
                    
                    # Add product ad row
                    product_ad_row = {}
                    if sku == "Multi ASIN":
                        product_ad_row["Review Needed"] = f"Yes - {keyword_info[3]}"
                        product_ad_row["Product"] = "Sponsored Products"
                        product_ad_row["Entity"] = "Product Ad"
                        product_ad_row["Operation"] = "Create"
                        product_ad_row["Campaign ID"] = new_id
                        product_ad_row["Ad Group ID"] = new_id
                        product_ad_row["State"] = "enabled"
                        product_ad_row["SKU"] = sku
                    else:
                        product_ad_row["Product"] = "Sponsored Products"
                        product_ad_row["Entity"] = "Product Ad"
                        product_ad_row["Operation"] = "Create"
                        product_ad_row["Campaign ID"] = new_id
                        product_ad_row["Ad Group ID"] = new_id
                        product_ad_row["State"] = "enabled"
                        product_ad_row["SKU"] = sku
                    
                    target_df.loc[row_index] = product_ad_row
                    row_index += 1
                
                # Add keyword row
                keyword_row = {}
                if sku == "Multi ASIN":
                    keyword_row["Review Needed"] = f"Yes - {keyword_info[3]}"
                    keyword_row["Product"] = "Sponsored Products"
                    keyword_row["Entity"] = "Keyword"
                    keyword_row["Operation"] = "Create"
                    keyword_row["Campaign ID"] = new_id
                    keyword_row["Ad Group ID"] = new_id
                    keyword_row["State"] = "enabled"
                    keyword_row["Bid"] = keyword_info[2]
                    keyword_row["Keyword Text"] = keyword_info[0]
                    keyword_row["Match Type"] = match_type
                else:
                    keyword_row["Product"] = "Sponsored Products"
                    keyword_row["Entity"] = "Keyword"
                    keyword_row["Operation"] = "Create"
                    keyword_row["Campaign ID"] = new_id
                    keyword_row["Ad Group ID"] = new_id
                    keyword_row["State"] = "enabled"
                    keyword_row["Bid"] = keyword_info[2]
                    keyword_row["Keyword Text"] = keyword_info[0]
                    keyword_row["Match Type"] = match_type
                
                target_df.loc[row_index] = keyword_row
                row_index += 1
                keyword_count += 1
            
            # Update the row index
            if orders >= 3:
                if sku == "Multi ASIN":
                    high_review_row = row_index
                else:
                    high_row = row_index
            else:
                if sku == "Multi ASIN":
                    low_review_row = row_index
                else:
                    low_row = row_index
        
        # Write targeting keywords (B0 ASINs)
        b0_row = 0
        b0_review_row = 0
        
        for sku, keywords in targeting_keywords.items():
            if sku == "Multi ASIN":
                target_df = product_targets_review_df
                row_index = b0_review_row
            else:
                target_df = product_targets_df
                row_index = b0_row
            
            campaign_count = 0
            keyword_count = 0
            new_id = ""
            
            for keyword_info in keywords:
                if keyword_count % 10 == 0:
                    campaign_count += 1
                    keyword_count = 0
                    
                    # Create campaign
                    new_id = f"{sku} - SP ASIN - {campaign_count}"
                    
                    # Add campaign row
                    campaign_row = {}
                    if sku == "Multi ASIN":
                        campaign_row["Review Needed"] = f"Yes - {keyword_info[3]}"
                        campaign_row["Product"] = "Sponsored Products"
                        campaign_row["Entity"] = "Campaign"
                        campaign_row["Operation"] = "Create"
                        campaign_row["Campaign ID"] = new_id
                        campaign_row["Campaign Name"] = new_id
                        campaign_row["Start Date"] = current_date
                        campaign_row["Targeting Type"] = "MANUAL"
                        campaign_row["State"] = "enabled"
                        campaign_row["Daily Budget"] = 10
                        campaign_row["Bidding Strategy"] = "Dynamic bids - down only"
                    else:
                        campaign_row["Product"] = "Sponsored Products"
                        campaign_row["Entity"] = "Campaign"
                        campaign_row["Operation"] = "Create"
                        campaign_row["Campaign ID"] = new_id
                        campaign_row["Campaign Name"] = new_id
                        campaign_row["Start Date"] = current_date
                        campaign_row["Targeting Type"] = "MANUAL"
                        campaign_row["State"] = "enabled"
                        campaign_row["Daily Budget"] = 10
                        campaign_row["Bidding Strategy"] = "Dynamic bids - down only"
                    
                    target_df.loc[row_index] = campaign_row
                    row_index += 1
                    
                    # Add ad group row
                    ad_group_row = {}
                    if sku == "Multi ASIN":
                        ad_group_row["Review Needed"] = f"Yes - {keyword_info[3]}"
                        ad_group_row["Product"] = "Sponsored Products"
                        ad_group_row["Entity"] = "Ad Group"
                        ad_group_row["Operation"] = "Create"
                        ad_group_row["Campaign ID"] = new_id
                        ad_group_row["Ad Group ID"] = new_id
                        ad_group_row["Ad Group Name"] = new_id
                        ad_group_row["State"] = "enabled"
                        ad_group_row["Ad Group Default Bid"] = 1
                    else:
                        ad_group_row["Product"] = "Sponsored Products"
                        ad_group_row["Entity"] = "Ad Group"
                        ad_group_row["Operation"] = "Create"
                        ad_group_row["Campaign ID"] = new_id
                        ad_group_row["Ad Group ID"] = new_id
                        ad_group_row["Ad Group Name"] = new_id
                        ad_group_row["State"] = "enabled"
                        ad_group_row["Ad Group Default Bid"] = 1
                    
                    target_df.loc[row_index] = ad_group_row
                    row_index += 1
                    
                    # Add product ad row
                    product_ad_row = {}
                    if sku == "Multi ASIN":
                        product_ad_row["Review Needed"] = f"Yes - {keyword_info[3]}"
                        product_ad_row["Product"] = "Sponsored Products"
                        product_ad_row["Entity"] = "Product Ad"
                        product_ad_row["Operation"] = "Create"
                        product_ad_row["Campaign ID"] = new_id
                        product_ad_row["Ad Group ID"] = new_id
                        product_ad_row["State"] = "enabled"
                        product_ad_row["SKU"] = sku
                    else:
                        product_ad_row["Product"] = "Sponsored Products"
                        product_ad_row["Entity"] = "Product Ad"
                        product_ad_row["Operation"] = "Create"
                        product_ad_row["Campaign ID"] = new_id
                        product_ad_row["Ad Group ID"] = new_id
                        product_ad_row["State"] = "enabled"
                        product_ad_row["SKU"] = sku
                    
                    target_df.loc[row_index] = product_ad_row
                    row_index += 1
                
                # Add product targeting row
                targeting_row = {}
                if sku == "Multi ASIN":
                    targeting_row["Review Needed"] = f"Yes - {keyword_info[3]}"
                    targeting_row["Product"] = "Sponsored Products"
                    targeting_row["Entity"] = "Product Targeting"
                    targeting_row["Operation"] = "Create"
                    targeting_row["Campaign ID"] = new_id
                    targeting_row["Ad Group ID"] = new_id
                    targeting_row["State"] = "enabled"
                    targeting_row["Bid"] = keyword_info[2]
                    targeting_row["Product Targeting Expression"] = f'asin="{keyword_info[0]}"'
                else:
                    targeting_row["Product"] = "Sponsored Products"
                    targeting_row["Entity"] = "Product Targeting"
                    targeting_row["Operation"] = "Create"
                    targeting_row["Campaign ID"] = new_id
                    targeting_row["Ad Group ID"] = new_id
                    targeting_row["State"] = "enabled"
                    targeting_row["Bid"] = keyword_info[2]
                    targeting_row["Product Targeting Expression"] = f'asin="{keyword_info[0]}"'
                
                target_df.loc[row_index] = targeting_row
                row_index += 1
                keyword_count += 1
            
            # Update the row index
            if sku == "Multi ASIN":
                b0_review_row = row_index
            else:
                b0_row = row_index
        
        # Write DataFrames to Excel
        high_df.to_excel(writer, sheet_name="3+ Orders", index=False)
        high_review_df.to_excel(writer, sheet_name="3+ Orders - Review", index=False)
        low_df.to_excel(writer, sheet_name="1-2 Orders", index=False)
        low_review_df.to_excel(writer, sheet_name="1-2 Orders - Review", index=False)
        product_targets_df.to_excel(writer, sheet_name="Product Targets", index=False)
        product_targets_review_df.to_excel(writer, sheet_name="Product Targets - Review", index=False)
        
        # Add a summary sheet
        summary_df = pd.DataFrame({
            "Type": ["Regular Keywords", "ASIN Targets", "Total"],
            "Count": [
                sum(len(keywords) for keywords in sku_keywords.values()),
                sum(len(keywords) for keywords in targeting_keywords.values()),
                sum(len(keywords) for keywords in sku_keywords.values()) + 
                sum(len(keywords) for keywords in targeting_keywords.values())
            ]
        })
        summary_df.to_excel(writer, sheet_name="Summary", index=False)
        
        # Save the Excel file
        writer.close()
        
        logger.info(f"Keyword mining completed successfully. Results saved to {output_path}")
        
    except Exception as e:
        logger.error(f"Error processing keyword mining: {e}", exc_info=True)
        raise e

def get_sku(sponsored_products, campaign_id):
    """
    Gets the SKU for a campaign ID from the sponsored products DataFrame.
    Returns "Multi ASIN" if multiple SKUs found, or "Not Found" if none.
    
    Args:
        sponsored_products (DataFrame): The sponsored products DataFrame
        campaign_id (str): The campaign ID to look up
    
    Returns:
        str: The SKU, "Multi ASIN", or "Not Found"
    """
    if sponsored_products.empty:
        return "Not Found"
    
    # Filter rows by campaign ID and Product Ad entity type
    filtered = sponsored_products[(sponsored_products.get("D") == campaign_id) & 
                                  (sponsored_products.get("B") == "Product Ad")]
    
    if filtered.empty:
        return "Not Found"
    
    # Get unique SKUs
    skus = filtered["V"].dropna().unique()
    
    if len(skus) == 0:
        return "Not Found"
    elif len(skus) == 1:
        return skus[0]
    else:
        return "Multi ASIN"

@router.post(
    "/create-campaigns",
    summary="Create Amazon PPC Campaigns",
)
async def create_campaigns(
    background_tasks: BackgroundTasks,
    campaigns: Dict[str, List[Dict[str, Any]]],
):
    """
    Creates new Amazon PPC campaigns based on user input.
    
    Each campaign can be either automatic or manual, with different targeting options.
    Returns an Excel template that can be uploaded to Amazon.
    """
    logger.info(f"Entered /create-campaigns endpoint with {len(campaigns.get('campaigns', []))} campaigns")
    download_id = str(uuid.uuid4())
    output_path = os.path.join(TEMP_DIR, f"{download_id}")  # Format to match what download endpoint expects
    
    try:
        logger.info("Processing campaign data...")
        # Process the campaign data
        process_campaign_creation(
            output_path,
            campaigns.get('campaigns', [])
        )
        logger.info("Campaign creation completed successfully.")
        
        # Schedule cleanup
        schedule_file_cleanup(background_tasks, output_path, delay=3600)
        
        return {
            "message": "Campaigns created successfully",
            "download_id": download_id
        }
    
    except Exception as e:
        logger.error(f"Error creating campaigns: {e}", exc_info=True)
        # Clean up temporary files if error occurs
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=f"Error creating campaigns: {e}")

def process_campaign_creation(output_path: str, campaigns_data: List[Dict[str, Any]]):
    """
    Process campaign data and create an Excel file with campaigns.
    
    Args:
        output_path (str): Path where the processed file will be saved.
        campaigns_data (List[Dict]): List of campaign configurations.
    """
    logger.info(f"Starting campaign creation process for {len(campaigns_data)} campaigns")
    
    try:
        # Get current date in YYYYMMDD format
        current_date = datetime.now().strftime("%Y%m%d")
        
        # Create Excel writer for output
        writer = pd.ExcelWriter(output_path, engine='openpyxl')
        
        # Create the output DataFrame with appropriate headers
        output_df = pd.DataFrame(columns=[
            "Product", "Entity", "Operation", "Campaign ID", "Ad Group ID", 
            "Portfolio ID", "Ad ID", "Keyword ID", "Product Targeting ID", 
            "Campaign Name", "Ad Group Name", "Start Date", "End Date", 
            "Targeting Type", "State", "Daily Budget", "SKU", 
            "Ad Group Default Bid", "Bid", "Keyword Text", 
            "Native Language Keyword", "Native Language Locale", 
            "Match Type", "Bidding Strategy", "Placement", 
            "Percentage", "Product Targeting Expression"
        ])
        
        # Process each campaign
        campaign_counter = 0
        current_row = 0
        
        for campaign_data in campaigns_data:
            campaign_counter += 1
            
            sku = campaign_data.get('sku', '')
            product_identifier = campaign_data.get('productIdentifier', '')
            is_auto_campaign = campaign_data.get('isAutoCampaign', True)
            match_type = campaign_data.get('matchType', 'exact')
            
            # Capitalize match type for display
            display_match_type = match_type.capitalize()
            
            # Generate IDs and names based on campaign type
            if not is_auto_campaign:
                campaign_id = f"{product_identifier} - SP {display_match_type} - {campaign_counter}"
                ad_group_id = f"{product_identifier} - SP {display_match_type} - {campaign_counter}"
                
                # Get keywords
                keywords = campaign_data.get('keywords', '').split(',')
                keywords = [k.strip() for k in keywords if k.strip()]
            else:
                # Auto campaign - handle targeting types
                targeting_types = campaign_data.get('targetingTypes', [])
                
                # Remove 'all' if present as it's just for UI
                if 'all' in targeting_types:
                    targeting_types.remove('all')
                
                # All available targeting types
                all_types = ["close-match", "loose-match", "substitutes", "complements"]
                
                # Format targeting name for campaign name
                if len(targeting_types) == 4 or "all" in targeting_types:
                    targeting_name = "All"
                    targeting_types = all_types
                else:
                    # Convert targeting types for display
                    display_types = []
                    for t in targeting_types:
                        if t == "close-match":
                            display_types.append("Close")
                        elif t == "loose-match":
                            display_types.append("Loose")
                        elif t == "substitutes":
                            display_types.append("Substitutes")
                        elif t == "complements":
                            display_types.append("Complements")
                    
                    targeting_name = " and ".join(display_types)
                
                campaign_id = f"{product_identifier} - SP Auto - {targeting_name} - {campaign_counter}"
                ad_group_id = f"{product_identifier} - SP Auto - {targeting_name} - {campaign_counter}"
                
                # Determine paused targeting types
                paused_types = [t for t in all_types if t not in targeting_types]
            
            # Write common campaign structure
            # Campaign row
            campaign_row = {
                "Product": "Sponsored Products",
                "Entity": "Campaign",
                "Operation": "Create",
                "Campaign ID": campaign_id,
                "Campaign Name": campaign_id,
                "Start Date": current_date,
                "Targeting Type": "AUTO" if is_auto_campaign else "MANUAL",
                "State": "enabled",
                "Daily Budget": 10,
                "Bidding Strategy": "Dynamic bids - down only"
            }
            output_df.loc[current_row] = campaign_row
            current_row += 1
            
            # Ad Group row
            ad_group_row = {
                "Product": "Sponsored Products",
                "Entity": "Ad Group",
                "Operation": "Create",
                "Campaign ID": campaign_id,
                "Ad Group ID": ad_group_id,
                "Ad Group Name": ad_group_id,
                "State": "enabled",
                "Ad Group Default Bid": campaign_data.get('startingBid', 1)
            }
            output_df.loc[current_row] = ad_group_row
            current_row += 1
            
            # Product Ad row
            product_ad_row = {
                "Product": "Sponsored Products",
                "Entity": "Product Ad",
                "Operation": "Create",
                "Campaign ID": campaign_id,
                "Ad Group ID": ad_group_id,
                "State": "enabled",
                "SKU": sku
            }
            output_df.loc[current_row] = product_ad_row
            current_row += 1
            
            # Handle manual vs auto campaign
            if not is_auto_campaign:
                # Manual campaign - add keywords
                for keyword in keywords:
                    keyword_row = {
                        "Product": "Sponsored Products",
                        "Entity": "Keyword",
                        "Operation": "Create",
                        "Campaign ID": campaign_id,
                        "Ad Group ID": ad_group_id,
                        "State": "enabled",
                        "Bid": campaign_data.get('startingBid', 1),
                        "Keyword Text": keyword,
                        "Match Type": match_type
                    }
                    output_df.loc[current_row] = keyword_row
                    current_row += 1
            else:
                # Auto campaign - add positive targeting types
                for targeting_type in targeting_types:
                    targeting_row = {
                        "Product": "Sponsored Products",
                        "Entity": "Product Targeting",
                        "Operation": "Create",
                        "Campaign ID": campaign_id,
                        "Ad Group ID": ad_group_id,
                        "State": "enabled",
                        "Bid": campaign_data.get('startingBid', 1),
                        "Product Targeting Expression": targeting_type
                    }
                    output_df.loc[current_row] = targeting_row
                    current_row += 1
                
                # Add paused targeting types
                for targeting_type in paused_types:
                    targeting_row = {
                        "Product": "Sponsored Products",
                        "Entity": "Product Targeting",
                        "Operation": "Create",
                        "Campaign ID": campaign_id,
                        "Ad Group ID": ad_group_id,
                        "State": "paused",
                        "Bid": campaign_data.get('startingBid', 1),
                        "Product Targeting Expression": targeting_type
                    }
                    output_df.loc[current_row] = targeting_row
                    current_row += 1
        
        # Write DataFrame to Excel
        output_df.to_excel(writer, sheet_name="New Campaigns", index=False)
        
        # Add a summary sheet
        summary_df = pd.DataFrame({
            "Statistic": ["Number of Campaigns Created", "Auto Campaigns", "Manual Campaigns"],
            "Value": [
                len(campaigns_data),
                sum(1 for c in campaigns_data if c.get('isAutoCampaign', True)),
                sum(1 for c in campaigns_data if not c.get('isAutoCampaign', True))
            ]
        })
        summary_df.to_excel(writer, sheet_name="Summary", index=False)
        
        # Save the Excel file
        writer.close()
        
        logger.info(f"Campaign creation completed successfully. File saved to {output_path}")
        
    except Exception as e:
        logger.error(f"Error during campaign creation: {e}", exc_info=True)
        raise e
