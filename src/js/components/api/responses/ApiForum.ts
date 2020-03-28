export interface ApiForumTopic {
    id: number,
    creator_id: number,
    updater_id: number,
    title: string,
    response_count: number,
    is_sticky: boolean,
    is_locked: boolean,
    is_hidden: boolean,
    created_at: string,
    updated_at: string,
    category_id: 9,
}

export interface ApiForumPost {
    id: number,
    created_at: string,
    updated_at: string,
    body: string,
    creator_id: number,
    updater_id: number,
    topic_id: number,
    is_hidden: boolean,
}
