import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeRoot } from './theme/ThemeRoot'
import { LoginScreen } from './screens/LoginScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { ProductsScreen } from './screens/ProductsScreen'
import { NewSaleScreen } from './screens/NewSaleScreen'

export default function App() {
  return (
    <ThemeRoot>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/home" element={<DashboardScreen />} />
        <Route path="/products" element={<ProductsScreen />} />
        <Route path="/sales/new" element={<NewSaleScreen />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeRoot>
  )
}

