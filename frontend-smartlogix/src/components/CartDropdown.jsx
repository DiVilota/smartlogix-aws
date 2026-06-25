import { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function CartDropdown({ userName }) {
  const { carrito, updateCantidad, clearCart, totalCarrito, itemsCount } = useCart();
  const [open, setOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    if (carrito.length === 0) return;
    setCheckingOut(true);
    setError(null);
    try {
      for (const item of carrito) {
        const response = await fetch('http://a656ac224048247fea9c6268aeb2bd00-1393924712.us-east-1.elb.amazonaws.com:8080/api/pedidos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('smartlogix_token')}`,
          },
          body: JSON.stringify({
            productoId: item.productoId,
            codigoProducto: item.codigoProducto,
            cantidad: item.cantidad,
            clienteId: userName,
          }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Error al crear pedido para ${item.nombre}`);
        }
      }
      clearCart();
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {itemsCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {itemsCount > 9 ? '9+' : itemsCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Carrito ({itemsCount})</h3>
              {carrito.length > 0 && (
                <button onClick={clearCart} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Vaciar</button>
              )}
            </div>

            {error && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs">{error}</div>
            )}

            <div className="max-h-[320px] overflow-y-auto">
              {carrito.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">Tu carrito está vacío</div>
              ) : carrito.map(item => (
                <div key={item.productoId} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.nombre}</p>
                      <p className="text-xs text-slate-500">${Number(item.precio).toLocaleString()} c/u</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCantidad(item.productoId, -1)}
                        className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 text-xs">−</button>
                      <span className="text-sm font-semibold text-slate-700 w-6 text-center">{item.cantidad}</span>
                      <button onClick={() => updateCantidad(item.productoId, 1)}
                        className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 text-xs">+</button>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">${Number(item.precio * item.cantidad).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {carrito.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total</span>
                  <span className="text-lg font-bold text-slate-800">${Number(totalCarrito).toLocaleString()}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-colors">
                  {checkingOut ? 'Procesando...' : 'Comprar ahora'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


