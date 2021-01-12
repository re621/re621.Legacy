import { Post } from "./Post";

/** Collection of Post objects */
export class PostSet {

    private posts: Post[];

    public constructor(posts?: Post[]) {
        this.posts = posts || [];
    }

    /** Adds a post to the set */
    public push(post: Post): void {
        this.posts.push(post);
    }

    /** Removes the last post from the set and returns it */
    public pop(): Post {
        return this.posts.pop();
    }

    /** Removes the first element from the set and returns it */
    public shift(): Post {
        return this.posts.shift();
    }

    /** Returns the number of posts in the set */
    public size(): number {
        return this.posts.length;
    }

    /** Returns a set with a reversed order */
    public reverse(): PostSet {
        return new PostSet(this.posts.reverse());
    }

    /** Returns an iteratable object for the set */
    public values(): IterableIterator<Post> {
        return this.posts.values();
    }

    /** Returns an array of posts contained within the set */
    public entries(): Post[] {
        return this.posts;
    }

    /** Executes the provided function on every element of the set */
    public each(fn: (post: Post) => void): void {
        for (const entry of this.posts) fn(entry);
    }

    /** Returns a set sorted via the provided method */
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
