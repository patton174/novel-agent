/** Library @-reference in editor chat — off when VITE_FEATURE_LIBRARY_REF=false */
export const FEATURE_LIBRARY_REF =
  import.meta.env.VITE_FEATURE_LIBRARY_REF !== 'false' &&
  import.meta.env.VITE_FEATURE_LIBRARY_REF !== '0'

/** Agent Skills picker + dashboard CRUD — dev default on (set VITE_FEATURE_AGENT_SKILLS=false to disable) */
export const FEATURE_AGENT_SKILLS =
  import.meta.env.VITE_FEATURE_AGENT_SKILLS !== 'false' &&
  import.meta.env.VITE_FEATURE_AGENT_SKILLS !== '0'

/** Agent Crew picker + stage progress + admin — dev default on */
export const FEATURE_AGENT_CREW =
  import.meta.env.VITE_FEATURE_AGENT_CREW !== 'false' &&
  import.meta.env.VITE_FEATURE_AGENT_CREW !== '0'
