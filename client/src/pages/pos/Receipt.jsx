import { formatMoney, formatDateTime } from '../../utils/format';
import { useSettings } from '../../context/SettingsContext';

export default function Receipt({ sale, onClose, onNewSale }) {
  const { business_name } = useSettings();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-sm">
        <div id="receipt-print" className="p-5 font-mono text-xs">
          <p className="text-center font-semibold text-sm">{business_name}</p>
          <p className="text-center">{sale.location?.name}</p>
          <div className="border-t border-dashed border-slate-400 my-2" />
          <p>Receipt: {sale.receipt_number}</p>
          <p>Sale: {sale.sale_number}</p>
          <p>Date: {formatDateTime(sale.createdAt)}</p>
          <p>Cashier: {sale.cashier?.name}</p>
          {sale.customer && <p>Customer: {sale.customer.name}</p>}
          <div className="border-t border-dashed border-slate-400 my-2" />
          {sale.items.map((i) => (
            <div key={i.id} className="flex justify-between">
              <span>{i.quantity} x {i.product?.name}</span>
              <span>{formatMoney(i.total)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-slate-400 my-2" />
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(sale.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(sale.discount_total)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatMoney(sale.tax_total)}</span></div>
          <div className="flex justify-between font-semibold text-sm"><span>TOTAL</span><span>{formatMoney(sale.total)}</span></div>
          <div className="border-t border-dashed border-slate-400 my-2" />
          {sale.payments.map((p) => (
            <div key={p.id} className="flex justify-between capitalize"><span>{p.method.replaceAll('_', ' ')}</span><span>{formatMoney(p.amount)}</span></div>
          ))}
          <div className="flex justify-between"><span>Change</span><span>{formatMoney(sale.change_due)}</span></div>
          <div className="border-t border-dashed border-slate-400 my-2" />
          <p className="text-center">Thank you for your purchase!</p>
          <p className="text-center text-[10px] text-slate-400 mt-2">Powered by Anknovate IT Services &middot; anknovate.com</p>
        </div>
        <div className="flex gap-2 p-4 border-t border-slate-200 print:hidden">
          <button className="btn-secondary flex-1" onClick={() => window.print()}>Print</button>
          <button className="btn-primary flex-1" onClick={onNewSale}>New Sale</button>
        </div>
        <button className="text-xs text-slate-400 hover:text-slate-600 pb-3 w-full print:hidden" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
