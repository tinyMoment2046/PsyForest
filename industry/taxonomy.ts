// 心理森林的分类与标签；公开分类 key 上线后不要改。
export const CATEGORIES = [
  { key: "practice", tagColor: "green", label: "自我关怀", section: "自我关怀与练习", guide: "读者可以自己练习的情绪调节、自我关怀、压力管理与日常心理保健方法；写清适用情境和局限，不写成个人诊疗建议", commentary: true },
  { key: "relationships", tagColor: "purple", label: "关系与依恋", section: "关系与依恋", guide: "亲密关系、家庭、友谊、边界、沟通与孤独感；以能帮读者理解自己关系模式的内容为主", commentary: true },
  { key: "research", tagColor: "indigo", label: "新研究", section: "研究速览", guide: "心理学的原创研究、综述与重复验证；只在结论能转成普通人可理解、可使用的认识时收录，需说明研究对象和局限" },
  { key: "clinical", tagColor: "turquoise", label: "心理常识", section: "心理常识", guide: "常见心理困扰、情绪与行为的常识性解释、求助与就医常识、误区纠偏；不做诊断、不提供停换药建议" },
  { key: "industry", tagColor: "orange", label: "行业与政策", section: "行业与政策", guide: "心理健康服务、从业规范与公共政策；课程推广和商业宣传不应成为主要内容" },
  { key: "opinion", tagColor: "violet", label: "概念解读", section: "概念与解读", guide: "把一个心理学概念讲清楚的科普、研究与生活现象的解读、访谈；有明确作者与出处，能区分事实和观点", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; tagColor: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

// 自我成长内容不需要固定的“新发布”计数。
export const RELEASE: { category: string; tag: string; unit: string } | null = null;
export const PLAIN_TERMS: readonly string[] = ["who", "dsm", "icd", "rct", "ptsd"];
export const ITEM_TYPES = ["self_help", "relationship", "research_paper", "clinical_guidance", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

export const CATEGORY_TAGS = ["自我关怀", "关系与沟通", "研究发现", "心理常识", "概念解读", "行业动态", "其他"] as const;
export const TOPIC_TAGS = ["情绪调节", "压力", "焦虑", "抑郁情绪", "睡眠", "依恋", "亲密关系", "人际关系", "孤独", "边界", "自尊", "沟通", "自我成长", "正念", "习惯", "决策", "儿童青少年", "职场", "创伤", "积极心理"] as const;
export const ENTITY_TAGS = ["WHO", "美国心理学会", "中科院心理所"] as const;
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  情绪: "情绪调节", 自我疗愈: "自我成长", 自助: "自我关怀", 心理健康: "自我关怀", 关系: "关系与沟通",
  论文: "研究发现", 研究: "研究发现", 治疗: "心理常识", 心理治疗: "心理常识", 临床: "心理常识", 科普: "概念解读", 解读: "概念解读", 政策: "行业动态",
};

export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; orgNames?: string[]; otherNames?: string[] }> = {
  who: { name: "世界卫生组织 WHO", displayTag: "WHO", aliases: ["WHO", "World Health Organization", "世界卫生组织"] },
  "apa-psychology": { name: "美国心理学会", displayTag: "美国心理学会", aliases: ["American Psychological Association", "美国心理学会"] },
  ipcas: { name: "中科院心理所", displayTag: "中科院心理所", aliases: ["中国科学院心理研究所", "中科院心理所"] },
};

export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [];
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [];
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
