import { Navigate, Route, Routes } from 'react-router-dom'
import { CreditDebtorDetailPage } from './CreditDebtorDetailPage'
import { CreditsOverviewPage } from './CreditsOverviewPage'

export function CreditsScreen() {
  return (
    <Routes>
      <Route index element={<CreditsOverviewPage />} />
      <Route path=":customerId" element={<CreditDebtorDetailPage />} />
      <Route path="*" element={<Navigate to="/credits" replace />} />
    </Routes>
  )
}
