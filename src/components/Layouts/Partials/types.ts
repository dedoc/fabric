export type Navigation = FolderNavigation|OperationNavigation|GuideNavigation

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
