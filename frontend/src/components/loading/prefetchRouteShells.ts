/** 启动后预拉 route-shells，路由 lazy 触发前骨架 chunk 已在缓存 */
export function prefetchRouteShells(): void {
  void import('./RouteFallbackShell')
}
