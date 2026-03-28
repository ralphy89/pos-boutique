import { Navigate, Route, Routes } from 'react-router-dom'
import { CustomerDetailPage } from './customers/CustomerDetailPage'
import { CustomerFormPage } from './customers/CustomerFormPage'
import { CustomersListPage } from './customers/CustomersListPage'

export function CustomersScreen() {
  return (
    <Routes>
      <Route index element={<CustomersListPage />} />
      <Route path="new" element={<CustomerFormPage mode="create" />} />
      <Route path=":customerId/edit" element={<CustomerFormPage mode="edit" />} />
      <Route path=":customerId" element={<CustomerDetailPage />} />
      <Route path="*" element={<Navigate to="/customers" replace />} />
    </Routes>
  )
}
