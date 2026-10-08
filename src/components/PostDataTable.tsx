import React from "react";
import { CreatorPost } from "@/types/evaluator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageCircle, Eye, Video, Image, EyeOff } from "lucide-react";

interface PostDataTableProps {
  posts: CreatorPost[];
  imputeHiddenLikes: boolean;
  medianVisibleLikes: number;
}

export function PostDataTable({
  posts,
  imputeHiddenLikes,
  medianVisibleLikes,
}: PostDataTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Post-Level Dataset Sample ({posts.length} Posts)
            </CardTitle>
            <CardDescription>
              Raw inputs captured from Bright Data Instagram Scraper
            </CardDescription>
          </div>
          {imputeHiddenLikes && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              Median Imputed: {medianVisibleLikes} Likes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
              <tr>
                <th className="p-2.5">Post ID</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Likes</th>
                <th className="p-2.5">Comments</th>
                <th className="p-2.5">Views</th>
                <th className="p-2.5">Discuss. Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post, idx) => {
                const effectiveLikes =
                  post.likes_hidden && imputeHiddenLikes
                    ? medianVisibleLikes
                    : post.likes;
                const ratio =
                  post.comments_count > 0
                    ? (effectiveLikes / post.comments_count).toFixed(1)
                    : "∞";

                return (
                  <tr key={post.post_id || idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                      #{idx + 1} ({post.post_id.slice(-6)})
                    </td>
                    <td className="p-2.5">
                      {post.is_video ? (
                        <span className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                          <Video className="h-3.5 w-3.5" />
                          <span>Video</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-muted-foreground">
                          <Image className="h-3.5 w-3.5" />
                          <span>Photo</span>
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      {post.date ? post.date.substring(0, 10) : "N/A"}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold text-foreground">
                          {effectiveLikes.toLocaleString()}
                        </span>
                        {post.likes_hidden && (
                          <Badge variant="warning" className="text-[9px] px-1 py-0 h-4">
                            <EyeOff className="h-2.5 w-2.5 mr-0.5" /> Hidden
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <MessageCircle className="h-3 w-3 text-muted-foreground" />
                        <span>{post.comments_count.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-2.5 font-mono text-muted-foreground">
                      {post.views > 0 ? (
                        <div className="flex items-center space-x-1.5">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span>{post.views.toLocaleString()}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-muted-foreground">
                      {ratio} : 1
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
