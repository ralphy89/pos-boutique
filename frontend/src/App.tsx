import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthGate } from './auth/AuthGate'
import { ThemeRoot } from './theme/ThemeRoot'
import { LoginScreen } from './screens/LoginScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { ProductsScreen } from './screens/ProductsScreen'
import { NewSaleScreen } from './screens/NewSaleScreen'
import { CustomersScreen } from './screens/CustomersScreen'
import { CashRegisterScreen } from './screens/CashRegisterScreen'

export default function App() {
  return (
    <ThemeRoot>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthGate mode="guest">
              <LoginScreen />
            </AuthGate>
          }
        />
        <Route
          path="/home"
          element={
            <AuthGate mode="protected">
              <DashboardScreen />
            </AuthGate>
          }
        />
        <Route
          path="/products"
          element={
            <AuthGate mode="protected">
              <ProductsScreen />
            </AuthGate>
          }
        />
        <Route
          path="/customers/*"
          element={
            <AuthGate mode="protected">
              <CustomersScreen />
            </AuthGate>
          }
        />
        <Route
          path="/sales/new"
          element={
            <AuthGate mode="protected">
              <NewSaleScreen />
            </AuthGate>
          }
        />
        <Route
          path="/cash-register"
          element={
            <AuthGate mode="protected">
              <CashRegisterScreen />
            </AuthGate>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeRoot>
  )
}

