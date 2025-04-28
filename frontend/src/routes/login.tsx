import { Box, Container, Flex, Heading, Image, Input, Text, Checkbox } from "@chakra-ui/react"
import {
  Link as RouterLink,
  createFileRoute,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiLock, FiMail } from "react-icons/fi"
import styled from "styled-components"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { emailPattern, passwordRules } from "../utils"

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #2d1b4e 0%, #1a0f2e 100%);
`

const LoginCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
`

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  padding: 20px;
`

const LogoWrapper = styled.div`
  width: 207px;
  height: 207px;
  border-radius: 50%;
  background: rgba(13, 10, 28, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 20px;
  
  &::before {
    content: '';
    position: absolute;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    border-radius: 50%;
    background: linear-gradient(45deg, #9c27b0, #673ab7);
    z-index: -1;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`

const Logo = styled.img`
  width: 159px;
  height: 159px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(156, 39, 176, 0.3));
`

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 20px;
  margin: 8px 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 16px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #9c27b0;
  }
`

const LoginButton = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
  }
`

const RememberForgotContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  color: white;
`

const RememberMeLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
`

const ForgotPassword = styled.span`
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  cursor: pointer;
  
  &:hover {
    color: #9c27b0;
  }
`

const StyledCheckbox = styled.input`
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  position: relative;
  
  &:checked {
    background: #9c27b0;
    border-color: #9c27b0;
  }
  
  &:checked::after {
    content: '✓';
    position: absolute;
    color: white;
    font-size: 14px;
    top: -1px;
    left: 2px;
  }
  
  &:hover {
    border-color: #9c27b0;
  }
`

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function Login() {
  const { loginMutation, error, resetError } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  return (
    <LoginContainer>
      <LoginCard>
        <form onSubmit={handleSubmit(onSubmit)}>
          <LogoContainer>
            <LogoWrapper>
              <Logo src="/assets/images/systems-lab-logo.png" alt="Systems Lab Logo" />
            </LogoWrapper>
          </LogoContainer>
          
          <Field
            invalid={!!errors.username}
            errorText={errors.username?.message || !!error}
          >
            <StyledInput
              type="email"
              placeholder="Email"
              {...register("username", {
                required: "Username is required",
                pattern: emailPattern,
              })}
            />
          </Field>
          
          <Field
            invalid={!!errors.password}
            errorText={errors.password?.message}
          >
            <StyledInput
              type="password"
              placeholder="Password"
              {...register("password", passwordRules())}
            />
          </Field>
          
          <RememberForgotContainer>
            <RememberMeLabel>
              <StyledCheckbox type="checkbox" />
              Remember me
            </RememberMeLabel>
            <RouterLink to="/recover-password">
              <ForgotPassword>Forgot Password?</ForgotPassword>
            </RouterLink>
          </RememberForgotContainer>
          
          <LoginButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "LOGIN"}
          </LoginButton>
        </form>
      </LoginCard>
    </LoginContainer>
  )
}
