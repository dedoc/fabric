export type Navigation = FolderNavigation|OperationNavigation

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
}
