import { Post } from "./Post";

export class PostSet {

    private posts: Post[];

    public constructor(posts?: Post[]) {
        this.posts = posts || [];
    }

    public push(post: Post): void {
        this.posts.push(post);
    }

    public pop(): Post {
        return this.posts.pop();
    }

    public size(): number {
        return this.posts.length;
    }

    public reverse(): PostSet {
        return new PostSet(this.posts.reverse());
    }

    public values(): IterableIterator<Post> {
        return this.posts.values();
    }

    public each(fn: (post: Post) => void): void {
        for (const entry of this.posts) fn(entry);
    }

    public sort(type?: PostSortType): PostSet {
        if (!type) type = PostSortType.ID;
        switch (type) {
            case PostSortType.Size:
                return this.sort(PostSortType.Size).reverse();
            case PostSortType.SizeAsc:
                return new PostSet([...this.posts.sort((a, b) => a.file.size - b.file.size)]);
            case PostSortType.ID:
                return this.sort(PostSortType.ID).reverse();
            case PostSortType.IDAsc:
                return new PostSet([...this.posts.sort((a, b) => a.id - b.id)]);
        }
    }

}

export enum PostSortType {
    ID = "id",
    IDAsc = "id_asc",
    Size = "size",
    SizeAsc = "size_asc",
}
