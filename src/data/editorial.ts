export type EditorialItem = {
  id: string
  title: string
  en: string
  src: string
  span?: 3 | 4 | 6 | 12
  height?: number
}

export type EditorialGroup = {
  id: string
  title: string
  en: string
  items: EditorialItem[]
}

const visual = (name: string) => `editorial/visual/${name}.webp`
const exhibition = (name: string) => `editorial/exhibition/${name}.webp`
const derivative = (name: string) => `editorial/derivatives/${name}.webp`

export const VISUAL_GROUPS: EditorialGroup[] = [
  {
    id: 'A', title: '海报', en: 'POSTERS', items: [
      { id: 'P1', title: '主视觉海报', en: 'MAIN VISUAL POSTER', src: visual('P01-main-visual'), span: 4, height: 500 },
      { id: 'P2', title: '异形海报 1', en: 'SHAPED POSTER 01', src: visual('P02-shaped-poster-1'), span: 4, height: 500 },
      { id: 'P3', title: '异形海报 2', en: 'SHAPED POSTER 02', src: visual('P03-shaped-poster-2'), span: 4, height: 500 },
    ],
  },
  {
    id: 'B', title: '展册', en: 'BROCHURE', items: [
      { id: 'P4', title: '展册正面', en: 'BROCHURE / FRONT', src: visual('P04-brochure-front'), span: 6, height: 560 },
      { id: 'P5', title: '展册背面', en: 'BROCHURE / BACK', src: visual('P05-brochure-back'), span: 6, height: 560 },
    ],
  },
  {
    id: 'C', title: '图形', en: 'GRAPHICS', items: [
      { id: 'P6', title: '图形系统', en: 'GRAPHIC SYSTEM', src: visual('P06-graphics'), span: 6, height: 360 },
      { id: 'P7', title: '字体与 Logo', en: 'TYPOGRAPHY & LOGO', src: visual('P07-type-logo'), span: 6, height: 360 },
    ],
  },
  {
    id: 'D', title: '导览平面', en: 'GUIDE PLANS', items: [
      { id: 'P8', title: '导览 1（墙贴）', en: 'GUIDE PLAN 01 / WALL GRAPHIC', src: visual('P08-guide-1'), span: 12, height: 240 },
      { id: 'P9', title: '导览 2（墙贴）', en: 'GUIDE PLAN 02 / WALL GRAPHIC', src: visual('P09-guide-2'), span: 12, height: 240 },
    ],
  },
  {
    id: 'E', title: '展线叙事', en: 'EXHIBITION NARRATIVE', items: [
      { id: 'P10', title: '展线叙事', en: 'EXHIBITION NARRATIVE', src: visual('P10-exhibition-narrative'), span: 6, height: 520 },
    ],
  },
]

export const UNIT_ITEMS: EditorialItem[] = [
  ['A', '时区板块展具', 'TIME ZONE DISPLAY', 'A-time-zone'],
  ['B', '国家板块展具', 'COUNTRY DISPLAY', 'B-country'],
  ['C', '年代板块展具', 'ERA DISPLAY', 'C-era'],
  ['D', '地点板块展具', 'LOCATION DISPLAY', 'D-location'],
  ['E', '主题板块展具', 'THEME DISPLAY', 'E-theme'],
  ['F', '类型板块展具', 'TYPE DISPLAY', 'F-type'],
  ['G', '载体板块展具', 'MEDIUM DISPLAY', 'G-medium'],
  ['H', '颜色板块展具', 'COLOR DISPLAY', 'H-color'],
].map(([id, title, en, name]) => ({ id, title, en, src: exhibition(name), span: 3, height: 440 }))

export const VENUE_ITEMS: EditorialItem[] = [1, 2, 3, 4].map((number) => ({
  id: `V${number}`,
  title: `场馆渲染 ${number}`,
  en: `VENUE RENDERING 0${number}`,
  src: exhibition(`venue-0${number}`),
  span: 6,
  height: 420,
}))

export const DERIVATIVE_GROUPS: EditorialGroup[] = [
  {
    id: '01', title: '工牌设计', en: 'IDENTIFICATION', items: [
      { id: 'D01', title: '嘉宾证', en: 'GUEST PASS', src: derivative('badge-guest'), span: 3, height: 420 },
      { id: 'D02', title: '媒体证', en: 'MEDIA PASS', src: derivative('badge-media'), span: 3, height: 420 },
      { id: 'D03', title: '工作人员证', en: 'STAFF PASS', src: derivative('badge-staff'), span: 3, height: 420 },
      { id: 'D04', title: '工牌样机', en: 'PASS MOCKUP', src: derivative('badge-mockup'), span: 3, height: 420 },
    ],
  },
  {
    id: '02', title: '门票与书签', en: 'TICKETS & BOOKMARKS', items: [
      ...[1, 2, 3, 4, 5, 6, 7].map((number): EditorialItem => ({
        id: `D${String(number + 4).padStart(2, '0')}`,
        title: `门票书签两种功能 ${number}`,
        en: `TICKET / BOOKMARK 0${number}`,
        src: derivative(`ticket-bookmark-0${number}`),
        span: 3,
        height: 420,
      })),
      { id: 'D12', title: '书签应用', en: 'BOOKMARK APPLICATION', src: derivative('bookmark'), span: 3, height: 420 },
    ],
  },
  {
    id: '03', title: '其他衍生', en: 'OTHER APPLICATIONS', items: [
      { id: 'D13', title: '卡片样机', en: 'CARD MOCKUP', src: derivative('card-mockup'), span: 3, height: 360 },
      { id: 'D14', title: '文件袋', en: 'FILE ENVELOPE', src: derivative('file-envelope'), span: 3, height: 360 },
      { id: 'D15', title: '水瓶样机', en: 'BOTTLE MOCKUP', src: derivative('bottle-mockup'), span: 3, height: 360 },
      { id: 'D16', title: '海报样机', en: 'POSTER MOCKUP', src: derivative('poster-mockup'), span: 3, height: 360 },
      { id: 'D17', title: '袋子样机', en: 'BAG MOCKUP', src: derivative('bag-mockup'), span: 3, height: 360 },
    ],
  },
]
