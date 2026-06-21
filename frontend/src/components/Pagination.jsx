export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)

      if (currentPage <= 2) {
        start = 2
        end = Math.min(4, totalPages - 1)
      }
      if (currentPage >= totalPages - 1) {
        start = Math.max(totalPages - 3, 2)
        end = totalPages - 1
      }

      if (start > 2) pages.push('ellipsis-start')
      for (let i = start; i <= end; i++) pages.push(i)
      if (end < totalPages - 1) pages.push('ellipsis-end')
      pages.push(totalPages)
    }
    return pages
  }

  const baseBtn =
    'px-2.5 md:px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500'
  const activeBtn = 'bg-primary-600 text-white'
  const inactiveBtn = 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
  const disabledBtn = 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mt-4">
      <p className="text-xs sm:text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </p>
      <nav className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${baseBtn} ${currentPage === 1 ? disabledBtn : inactiveBtn}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {pageNumbers.map((page, idx) =>
          typeof page === 'string' ? (
            <span key={page} className="px-2 text-gray-400 text-sm">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`${baseBtn} ${page === currentPage ? activeBtn : inactiveBtn}`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${baseBtn} ${currentPage === totalPages ? disabledBtn : inactiveBtn}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    </div>
  )
}
