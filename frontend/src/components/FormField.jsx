export default function FormField({
  label,
  error,
  warning,
  success,
  loading,
  required,
  children,
  hint,
  maxLength,
  currentLength,
  touched,
  name,
}) {
  const hasError = error && touched
  const hasWarning = warning && touched
  const borderColor = hasError
    ? 'border-red-400'
    : hasWarning
    ? 'border-yellow-400'
    : success && touched
    ? 'border-green-400'
    : 'border-gray-300'

  const childrenWithProps = children?.type
    ? children.type === 'input' || children.type === 'select' || children.type === 'textarea'
      ? {
          ...children,
          props: {
            ...children.props,
            className: `${children.props.className || ''} ${borderColor}`.trim(),
          },
        }
      : children
    : children

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {children}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
        {!loading && success && touched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {!loading && hasError && !success && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>
      {hasError && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      {hasWarning && (
        <p className="text-yellow-600 text-xs mt-1 flex items-center gap-1">
          <span>⚠️</span> {warning}
        </p>
      )}
      {hint && !hasError && !hasWarning && (
        <p className="text-gray-400 text-xs mt-1">{hint}</p>
      )}
      {maxLength && typeof currentLength === 'number' && (
        <p className={`text-xs mt-1 text-right ${currentLength > 400 ? 'text-red-500' : 'text-gray-400'}`}>
          {currentLength}/{maxLength}
        </p>
      )}
    </div>
  )
}
