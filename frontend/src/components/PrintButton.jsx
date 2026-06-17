import toast from 'react-hot-toast'

export default function PrintButton({ label = 'Print', className = '' }) {
  const handlePrint = () => {
    window.print()
    toast.success('Printing...')
  }

  return (
    <button
      onClick={handlePrint}
      className={`btn-primary inline-flex items-center gap-2 ${className}`}
    >
      🖨️ {label}
    </button>
  )
}
