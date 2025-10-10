# Supabase Schema Reference (Human-readable)
## projects
- id: UUID (PK)
- name: TEXT
- created_by: UUID (FK → users)
- domain: TEXT unique
- created_at: TIMESTAMP default now()
- updated_at: TIMESTAMP default now()

## pages
- id: UUID (PK)
- project_id: UUID (FK → projects)
- title: TEXT
- slug: TEXT
- order_num: INT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

## elements
- id: UUID (PK)
- page_id: UUID (FK → pages)
- parent_id: UUID? (null for root)
- tag: TEXT ('div','Button',...)
- props: JSONB (style/className/events/component props)
- order_num: INT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

## design_tokens
- id: UUID (PK)
- project_id: UUID (FK → projects)
- theme_id: UUID (FK → design_themes)
- name: TEXT (e.g., color.brand.primary)
- type: TEXT (color/typography/spacing/shadow)
- value: JSONB
- scope: TEXT ('raw'/'semantic')
- alias_of: TEXT?
- css_variable: TEXT? (e.g., --color-primary)
- created_at: TIMESTAMP

## design_themes
- id: UUID (PK)
- project_id: UUID (FK → projects)
- name: TEXT
- status: TEXT (active/archived)
- version: INT (default 1)
- created_at: TIMESTAMP
