export type Navigation = FolderNavigation|SectionNavigation|OperationNavigation|GuideNavigation

export type SectionNavigation = {
    id: string,
    type: 'section',
    name: string,
    children: Navigation[],
}

export type GuideNavigation = {
    id: string,
    type: 'guide',
    name: string,
}

export type FolderNavigation = {
    id: string,
    type: 'folder',
    name: string,
    children: Navigation[],
}

export type OperationNavigation = {
    id: string,
    type: 'operation',
    name: string,
    method: string,
    webhook?: boolean,
}
