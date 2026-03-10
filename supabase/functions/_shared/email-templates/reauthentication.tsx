/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your FinnyLand verification code 🔐</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🔐</Text>
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use this code to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore it.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Nunito', 'Quicksand', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { fontSize: '40px', textAlign: 'center' as const, margin: '0 0 8px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 18%, 18%)',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 48%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(172, 52%, 44%)',
  margin: '0 0 30px',
  textAlign: 'center' as const,
  letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
