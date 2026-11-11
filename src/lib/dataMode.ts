/** Production is the default. Demo fixtures never enter the live member directory. */
export const isDemoMode = import.meta.env.VITE_DATA_MODE === 'demo'
