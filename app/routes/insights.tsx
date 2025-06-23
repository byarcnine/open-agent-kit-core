/*

import { useEffect, useMemo, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { getUsageForAgent } from "~/lib/llm/usage.server";

import {
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.super_admin"],
  );

  const userScopes = await getUserScopes(user);

  return {
    user: user as SessionUser,
    userScopes,
    usage: undefined,
  };
};

export const action = async ({ request, params }: LoaderFunctionArgs) => {
  // get rec form data
  const formData = await request.formData();
  const agentId = formData.get("agentId");
  const time = formData.get("time");
  const usage = await getUsageForAgent(agentId as string, time as string);
  console.log(
    "Fetched usage for agent:",
    agentId,
    "Time range:",
    time,
    "Usage data:",
    usage,
  );
  return { usage };
};

const CostControl = () => {
  const { user, userScopes } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [usage, setUsage] = useState([]);
  const [timeRange, setTimeRange] = useState("7");
  const [activeAgent, setActiveAgent] = useState("general-moodley-agent");
  const timeRangeOptions = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
  ];

  const fetchAgentUsage = () => {
    console.log(
      "Fetching usage for agent:",
      activeAgent,
      "Time range:",
      timeRange,
    );
    fetcher.submit(
      { agentId: activeAgent, time: timeRange },
      { method: "POST", action: "/cost_control" },
    );
  };
  useEffect(() => {
    console.log("Active agent changed:", activeAgent);
    fetchAgentUsage();
  }, [activeAgent, timeRange]);

  useEffect(() => {
    if (fetcher.data?.usage) {
      setUsage(fetcher.data.usage);
    }
  }, [fetcher.data]);

  const modelPricing = {
    "gpt-4.1": { input: 0.03, output: 0.06 },
    "gpt-3.5": { input: 0.0015, output: 0.002 },
    "claude-3": { input: 0.015, output: 0.075 },
  };

  // Calculate costs and metrics
  const chartData = useMemo(() => {
    return usage
      .map((item) => {
        const pricing = modelPricing[item.modelId] || modelPricing["gpt-4.1"];
        const inputCost = (Number(item.inputTokens) / 1000) * pricing.input;
        const outputCost = (Number(item.outputTokens) / 1000) * pricing.output;
        const totalCost = inputCost + outputCost;
        const totalTokens = item.inputTokens + item.outputTokens;

        return {
          ...item,
          inputCost,
          outputCost,
          totalCost,
          totalTokens,
          costPerInvocation:
            Number(item.invocations) > 0
              ? totalCost / Number(item.invocations)
              : 0,
          date: new Date(item.createdAt)
            .toLocaleDateString("en-GB")
            .replace(/\//g, "."),
        };
      })
      .sort((a, b) => {
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }, [activeAgent, usage, timeRange]);

  const totalInputTokens =
    chartData?.length > 0
      ? chartData.reduce(
          (acc, item) =>
            acc + (item.inputTokens ? Number(item.inputTokens) : 0),
          0,
        )
      : 0;

  const totalOutputTokens =
    chartData?.length > 0
      ? chartData.reduce(
          (acc, item) =>
            acc + (item.outputTokens ? Number(item.outputTokens) : 0),
          0,
        )
      : 0;

  const totalTokens = totalInputTokens + totalOutputTokens;

  console.log("Chart data:", chartData);
  console.log("Usage data:", usage);

  console.log(activeAgent);
  return (
    <Layout navComponent={<OverviewNav userScopes={userScopes} />} user={user}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-medium">Cost Control</h1>
            <Label className="mt-4">Select Timeframe</Label>
            <Select
              onValueChange={(value) => setTimeRange(value)}
              name="timeRange"
              defaultValue={timeRangeOptions[0].value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label className="mt-4">Select Agent</Label>
            <Select
              onValueChange={(value) => setActiveAgent(value)}
              name="agents"
              defaultValue={"general-moodley-agent"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                {[
                  {
                    value: "general-moodley-agent",
                    label: "Moodley General Agent",
                  },
                  { value: "alex", label: "Alex" },
                ].map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardHeader>
                <CardTitle>Total Tokens</CardTitle>
              </CardHeader>
              <CardContent>{totalTokens}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Input</CardTitle>
              </CardHeader>
              <CardContent>{totalInputTokens}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Output</CardTitle>
              </CardHeader>
              <CardContent>{totalOutputTokens}</CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Cost Trend Over Time</CardTitle>
            </CardHeader>

            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="cost" orientation="left" />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "totalCost" ? `$${value.toFixed(2)}` : value,
                      name === "totalCost" ? "Total Cost" : "Invocations",
                    ]}
                  />
                  <Area
                    yAxisId="cost"
                    type="monotone"
                    dataKey="totalCost"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                  />
                  <Line
                    yAxisId="invocations"
                    type="monotone"
                    dataKey="invocations"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CostControl;


*/
