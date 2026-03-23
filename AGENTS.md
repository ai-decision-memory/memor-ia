# AGENTS.md

## Changelog Updates

When editing `docs/changelog-draft.mdx` or `docs/changelog.mdx`:

- Treat each `<Update ...>` block as a single grouped release entry.
- Within one `<Update>` block, never create duplicate `##` section headings with the same title.
- If a section like `## New`, `## Improved`, `## Fixed`, `## Operations`, or `## Foundation` already exists in that `<Update>` block, append the new item to the existing section instead of creating another section with the same heading.
- Preserve the existing section order. Only create a new section when no matching heading exists yet in that `<Update>` block.
- Keep each feature as a bullet under the correct existing section.

