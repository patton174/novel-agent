/** Library @-reference in editor chat — off when VITE_FEATURE_LIBRARY_REF=false */
export const FEATURE_LIBRARY_REF =
  import.meta.env.VITE_FEATURE_LIBRARY_REF !== 'false' &&
  import.meta.env.VITE_FEATURE_LIBRARY_REF !== '0'
