import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import Today from './screens/Today'
import Products from './screens/Products'
import ProductCard from './screens/ProductCard'
import Sell from './screens/Sell'
import SaleResult from './screens/SaleResult'
import Credit from './screens/Credit'
import CustomerCard from './screens/CustomerCard'
import More from './screens/More'
import SalesHistory from './screens/SalesHistory'
import SaleDetail from './screens/SaleDetail'
import Settings from './screens/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductCard />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/sell/done/:id" element={<SaleResult />} />
        <Route path="/credit" element={<Credit />} />
        <Route path="/credit/:id" element={<CustomerCard />} />
        <Route path="/more" element={<More />} />
        <Route path="/more/sales" element={<SalesHistory />} />
        <Route path="/more/sales/:id" element={<SaleDetail />} />
        <Route path="/more/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  )
}
