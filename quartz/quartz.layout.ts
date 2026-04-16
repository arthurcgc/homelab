import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import TagColors from "./quartz/components/TagColors"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [TagColors()],
  footer: Component.Footer({ links: {} }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer({ folderDefaultState: "open" }),
  ],
  right: [
    Component.Graph({
      localGraph: {
        depth: 2,
        repelForce: 0.7,
        centerForce: 0.3,
        linkDistance: 40,
        fontSize: 0.7,
        scale: 1.2,
        focusOnHover: true,
        showTags: true,
      },
      globalGraph: {
        repelForce: 0.6,
        centerForce: 0.2,
        linkDistance: 40,
        fontSize: 0.7,
        focusOnHover: true,
        showTags: true,
        enableRadial: true,
      },
    }),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({ folderDefaultState: "open" }),
  ],
  right: [],
}
