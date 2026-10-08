import React from "react";
import { EvaluationResult, CreatorPost } from "@/types/evaluator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface AnalyticsChartsProps {
  result: EvaluationResult;
  posts: CreatorPost[];
}

export function AnalyticsCharts({ result, posts }: AnalyticsChartsProps) {
  const { reach_breakdown, auth_breakdown } = result;

  // 1. Radar Chart Data (6 Evaluation Pillars)
  const radarData = [
    {
      pillar: "Audience Size",
      score: reach_breakdown.follower_tier_score,
      benchmark: 100,
    },
    {
      pillar: "Interaction Volume",
      score: reach_breakdown.engagement_volume_score,
      benchmark: 100,
    },
    {
      pillar: "Publishing History",
      score: reach_breakdown.content_activity_score,
      benchmark: 100,
    },
    {
      pillar: "Engagement Rate",
      score: auth_breakdown.engagement_rate,
      benchmark: 100,
    },
    {
      pillar: "Discussiveness",
      score: auth_breakdown.like_comment_ratio,
      benchmark: 100,
    },
    {
      pillar: "Variance (CV)",
      score: auth_breakdown.consistency,
      benchmark: 100,
    },
  ];

  // 2. Post Engagement Trend Data (chronological order)
  const trendData = [...posts]
    .reverse()
    .map((post, index) => ({
      index: `#${index + 1}`,
      date: post.date ? post.date.substring(0, 10) : `Post ${index + 1}`,
      likes: post.likes || 0,
      comments: post.comments_count || 0,
      views: post.views || 0,
      hidden: post.likes_hidden,
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar / Spider Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              6-Pillar Evaluation Spider Radar
            </CardTitle>
            <CardDescription>
              Compares creator sub-signals against organic ideal (100 pts)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#888888" strokeOpacity={0.2} />
                <PolarAngleAxis
                  dataKey="pillar"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#888888" strokeOpacity={0.2} />
                <Radar
                  name="Creator Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Benchmark Target"
                  dataKey="benchmark"
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  fill="#10b981"
                  fillOpacity={0.05}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Post-by-Post Engagement Trend Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Post Engagement Trajectory & Variance
            </CardTitle>
            <CardDescription>
              Uncovers flat bot packages (horizontal lines) vs natural organic spikes
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.15} />
                <XAxis dataKey="index" tick={{ fontSize: 10, fill: "currentColor" }} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString()}`,
                    name === "likes" ? "Likes" : name === "comments" ? "Comments" : name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  type="monotone"
                  dataKey="likes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Likes"
                />
                <Line
                  type="monotone"
                  dataKey="comments"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Comments"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Post Comments vs Likes Distribution Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Comment Interaction Density Per Post
          </CardTitle>
          <CardDescription>
            Detects silent purchased likes (0 comments) and engagement pod rings (1:1 like-to-comment ratio)
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.15} />
              <XAxis dataKey="index" tick={{ fontSize: 10, fill: "currentColor" }} />
              <YAxis tick={{ fontSize: 10, fill: "currentColor" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="comments" fill="#10b981" name="Comments" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
