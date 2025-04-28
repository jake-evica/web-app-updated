import type { ApiError } from "./client"
import useCustomToast from "./hooks/useCustomToast"

export const emailPattern = {
  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  message: "Invalid email address",
}

export const namePattern = {
  value: /^[A-Za-z\s\u00C0-\u017F]{1,30}$/,
  message: "Invalid name",
}

export const passwordRules = (isRequired = true) => {
  const rules: any = {
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters",
    },
  }

  if (isRequired) {
    rules.required = "Password is required"
  }

  return rules
}

export const confirmPasswordRules = (
  getValues: () => any,
  isRequired = true,
) => {
  const rules: any = {
    validate: (value: string) => {
      const password = getValues().password || getValues().new_password
      return value === password ? true : "The passwords do not match"
    },
  }

  if (isRequired) {
    rules.required = "Password confirmation is required"
  }

  return rules
}

export const handleError = (err: ApiError) => {
  const { showErrorToast } = useCustomToast()
  const errDetail = (err.body as any)?.detail
  let errorMessage = errDetail || "Something went wrong."
  if (Array.isArray(errDetail) && errDetail.length > 0) {
    errorMessage = errDetail[0].msg
  }
  showErrorToast(errorMessage)
}

/**
 * Tests connectivity to the API by making a simple fetch request to a health check endpoint
 * This is useful for diagnosing URL loading issues
 */
export async function testApiConnectivity() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  try {
    console.log("Testing API connectivity to:", apiUrl);
    
    // Test direct fetch without using the SDK
    const response = await fetch(`${apiUrl}/api/v1/utils/health-check/`);
    const data = await response.json();
    
    console.log("API connectivity test result:", {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries([...response.headers.entries()]),
    });
    
    return { success: true, status: response.status, data };
  } catch (error) {
    console.error("API connectivity test failed:", error);
    return { success: false, error };
  }
}

/**
 * Tests for potential CORS issues by sending a preflight request
 * This is useful to diagnose if CORS is blocking API requests
 */
export async function testCorsConfiguration() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  try {
    console.log("Testing CORS configuration with:", apiUrl);
    
    // Make a request that triggers CORS preflight
    const response = await fetch(`${apiUrl}/api/v1/utils/health-check/`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });
    
    console.log("CORS test result:", {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries([...response.headers.entries()]),
      origin: window.location.origin,
    });
    
    // Check for CORS headers
    const corsHeaders = {
      allowOrigin: response.headers.get('Access-Control-Allow-Origin'),
      allowMethods: response.headers.get('Access-Control-Allow-Methods'),
      allowHeaders: response.headers.get('Access-Control-Allow-Headers'),
    };
    
    return { 
      success: !!corsHeaders.allowOrigin, 
      corsHeaders,
      origin: window.location.origin 
    };
  } catch (error) {
    console.error("CORS test failed:", error);
    return { success: false, error, origin: window.location.origin };
  }
}
