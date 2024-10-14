import { useEffect, useState } from 'react'

export default function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setDebouncedValue((originalValue) =>
          value === originalValue ? originalValue : value,
        ),
      delay,
    )
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debouncedValue
}
