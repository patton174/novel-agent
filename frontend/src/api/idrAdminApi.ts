import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export interface IdrMerchantBasic {
  name: string | null
  desc: string | null
}

export interface IdrProjectItem {
  id: string
  name: string
  status: string | null
  type: string | null
  slug: string | null
  desc: string | null
}

export interface IdrSkuItem {
  id: string
  name: string
  status: string | null
  stock: number | null
  itemType: string | null
  sold: number | null
  itemsNum: number | null
}

export interface IdrSkuDetail {
  id: string
  name: string
  status: string | null
  stock: number | null
  itemType: string | null
  itemsNum: number | null
  sold: number | null
  hiddenStock: boolean | null
  projectId: string | null
  items: string[]
}

export interface IdrSkuInventoryUpdate {
  mode?: 'append' | 'replace'
  itemType?: 'reuse' | 'consumable'
  items?: string[]
  quantity?: number
  status?: 'ONLINE' | 'OFFLINE'
}

export interface IdrPricingItem {
  id: string
  status: string | null
  scope: string | null
  policy: string | null
  price: number | null
}

export interface IdrCouponItem {
  id: string
  status: string | null
  code: string | null
  policy: string | null
  scope: string | null
}

export interface IdrProjectDetail {
  project: IdrProjectItem
  skus: IdrSkuItem[]
  pricings: IdrPricingItem[]
  coupons: IdrCouponItem[]
}

async function parseResponse<T>(res: Response): Promise<T> {
  return parseResultResponse<T>(res)
}

export async function fetchIdrMerchantBasic(): Promise<IdrMerchantBasic> {
  const res = await secureFetch('/api/billing/crm/idatariver/merchant')
  if (!res.ok) {
    throw new Error('拉取商户信息失败，请先保存 Merchant Secret')
  }
  return parseResponse<IdrMerchantBasic>(res)
}

export async function fetchIdrProjects(): Promise<IdrProjectItem[]> {
  const res = await secureFetch('/api/billing/crm/idatariver/projects')
  if (!res.ok) {
    throw new Error('拉取项目列表失败，请先保存 Merchant Secret')
  }
  const data = await parseResponse<{ projects: IdrProjectItem[] }>(res)
  return Array.isArray(data?.projects) ? data.projects : []
}

export async function fetchIdrProjectDetail(projectId: string): Promise<IdrProjectDetail> {
  const res = await secureFetch(`/api/billing/crm/idatariver/projects/${encodeURIComponent(projectId)}`)
  if (!res.ok) {
    throw new Error('拉取项目详情失败')
  }
  const data = await parseResponse<IdrProjectDetail>(res)
  return {
    project: data.project,
    skus: Array.isArray(data.skus) ? data.skus : [],
    pricings: Array.isArray(data.pricings) ? data.pricings : [],
    coupons: Array.isArray(data.coupons) ? data.coupons : [],
  }
}

export function formatIdrProjectLabel(project: IdrProjectItem): string {
  const status = project.status ? ` · ${project.status}` : ''
  return `${project.name}${status}`
}

export function formatIdrSkuLabel(sku: IdrSkuItem): string {
  const status = sku.status ? ` · ${sku.status}` : ''
  const stockLabel =
    sku.stock != null
      ? ` · 库存 ${sku.stock}`
      : sku.itemsNum != null
        ? ` · 卡密 ${sku.itemsNum}`
        : ''
  return `${sku.name}${status}${stockLabel}`
}

export async function fetchIdrSkuDetail(skuId: string): Promise<IdrSkuDetail> {
  const res = await secureFetch(`/api/billing/crm/idatariver/skus/${encodeURIComponent(skuId)}`)
  if (!res.ok) {
    throw new Error('加载 SKU 详情失败')
  }
  const data = await parseResponse<IdrSkuDetail>(res)
  return {
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
  }
}

export async function updateIdrSkuInventory(
  skuId: string,
  payload: IdrSkuInventoryUpdate,
): Promise<IdrSkuDetail> {
  const res = await secureFetch(`/api/billing/crm/idatariver/skus/${encodeURIComponent(skuId)}/inventory`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('更新库存失败')
  }
  const data = await parseResponse<IdrSkuDetail>(res)
  return {
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
  }
}

export function resolveSkuStockCount(sku: Pick<IdrSkuItem, 'stock' | 'itemsNum'>): number | null {
  if (sku.stock != null) return sku.stock
  if (sku.itemsNum != null) return sku.itemsNum
  return null
}

export interface IdrSkuCreatePayload {
  name: string
  status?: 'ONLINE' | 'OFFLINE'
  quantity?: number
}

export interface IdrPricingCreatePayload {
  status?: 'ONLINE' | 'OFFLINE'
  scope?: 'global' | 'specific'
  scopeItems?: string[]
  policy?: 'fixed'
  price: string
}

export interface IdrCouponCreatePayload {
  status?: 'ONLINE' | 'OFFLINE'
  scope?: 'global' | 'specific'
  scopeItems?: string[]
  policy: 'reduction' | 'discount' | 'fixed'
  reduction?: number
  fixed?: number
  discount?: number
  capped?: number
}

export async function createIdrSku(projectId: string, payload: IdrSkuCreatePayload): Promise<IdrSkuItem> {
  const res = await secureFetch(`/api/billing/crm/idatariver/projects/${encodeURIComponent(projectId)}/skus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('创建商品失败')
  }
  return parseResponse<IdrSkuItem>(res)
}

export async function createIdrPricing(
  projectId: string,
  payload: IdrPricingCreatePayload,
): Promise<IdrPricingItem> {
  const res = await secureFetch(
    `/api/billing/crm/idatariver/projects/${encodeURIComponent(projectId)}/pricings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) {
    throw new Error('创建定价失败')
  }
  return parseResponse<IdrPricingItem>(res)
}

export async function createIdrCoupon(
  projectId: string,
  payload: IdrCouponCreatePayload,
): Promise<IdrCouponItem> {
  const res = await secureFetch(
    `/api/billing/crm/idatariver/projects/${encodeURIComponent(projectId)}/coupons`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) {
    throw new Error('创建优惠券失败')
  }
  return parseResponse<IdrCouponItem>(res)
}

export interface IdrSkuUpdatePayload {
  name?: string
  status?: 'ONLINE' | 'OFFLINE'
}

export interface IdrPricingUpdatePayload {
  status?: 'ONLINE' | 'OFFLINE'
  price?: string
}

export interface IdrCouponUpdatePayload {
  status: 'ONLINE' | 'OFFLINE'
}

export async function updateIdrSku(skuId: string, payload: IdrSkuUpdatePayload): Promise<IdrSkuItem> {
  const res = await secureFetch(`/api/billing/crm/idatariver/skus/${encodeURIComponent(skuId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('更新商品失败')
  }
  return parseResponse<IdrSkuItem>(res)
}

export async function updateIdrPricing(
  pricingId: string,
  payload: IdrPricingUpdatePayload,
): Promise<IdrPricingItem> {
  const res = await secureFetch(
    `/api/billing/crm/idatariver/pricings/${encodeURIComponent(pricingId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) {
    throw new Error('更新定价失败')
  }
  return parseResponse<IdrPricingItem>(res)
}

export async function updateIdrCoupon(
  couponId: string,
  payload: IdrCouponUpdatePayload,
): Promise<IdrCouponItem> {
  const res = await secureFetch(
    `/api/billing/crm/idatariver/coupons/${encodeURIComponent(couponId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) {
    throw new Error('更新优惠券失败')
  }
  return parseResponse<IdrCouponItem>(res)
}
