// import {
//   useLoaderData,
//   useActionData,
//   type LoaderFunctionArgs,
//   type ActionFunctionArgs,
//   data,
//   Link,
//   type MetaFunction,
//   Form,
// } from "react-router";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "~/components/ui/table";
// import { prisma } from "@db/db.server";
// import Layout from "~/components/layout/layout";
// import { Button } from "~/components/ui/button";
// import { Badge } from "~/components/ui/badge";
// import { Label } from "~/components/ui/label";
// import { z } from "zod";
// import { useEffect, useState } from "react";
// import { toast, Toaster } from "sonner";
// import {
//   getUserScopes,
//   hasAccessHierarchical,
// } from "~/lib/permissions/enhancedHasAccess.server";
// import {
//   PERMISSION,
//   AVAILABLE_PERMISSIONS,
// } from "~/lib/permissions/permissions";
// import type { SessionUser } from "~/types/auth";
// import { SpaceDetailNav } from "~/components/spaceDetailNav/spaceDetailNav";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "~/components/ui/card";
// import {
//   ArrowLeft,
//   Settings,
//   Users,
//   ChevronDown,
//   ChevronRight,
//   Check,
//   ArrowDown,
// } from "react-feather";
// import {
//   getAllPermissionsWithInheritance,
//   HierarchicalPermissionChecker,
//   type PermissionContext,
// } from "~/lib/permissions/hierarchical";
// import { PermissionHierarchyDisplay } from "~/components/hierarchicalPermissionDisplay";

// const updatePermissionsSchema = z.object({
//   permissions: z.array(z.string()),
// });

// type ActionData = {
//   success: boolean;
//   error?: string;
//   message?: string;
//   intent: string;
// };

// export const action = async ({ request, params }: ActionFunctionArgs) => {
//   const { spaceId, groupId } = params;

//   if (!spaceId || !groupId) {
//     return { errors: { general: ["Space ID and Group ID are required"] } };
//   }

//   await hasAccessHierarchical(request, PERMISSION["space.edit_users"], spaceId);

//   const formData = await request.formData();
//   const intent = formData.get("intent");

//   if (intent === "updatePermissions") {
//     const result = updatePermissionsSchema.safeParse({
//       permissions: formData.getAll("permissions"),
//     });

//     if (!result.success) {
//       return data<ActionData>(
//         {
//           success: false,
//           intent: intent as string,
//           error: result.error.issues[0].message,
//         },
//         { status: 400 },
//       );
//     }

//     const { permissions } = result.data;
//     const context = formData.get("context") as string;
//     const referenceId = formData.get("referenceId") as string;

//     try {
//       // Remove existing permissions for this context
//       let whereClause: any = { permissionGroupId: groupId };

//       if (context === "space") {
//         whereClause.referenceId = spaceId;
//         whereClause.scope = { startsWith: "space." };
//       } else if (context === "agent") {
//         whereClause.referenceId = referenceId;
//         whereClause.scope = { startsWith: "agent." };
//       }

//       await prisma.permission.deleteMany({ where: whereClause });

//       // Add new permissions
//       if (permissions.length > 0) {
//         const permissionData = permissions.map((permission) => ({
//           scope: permission,
//           referenceId: context === "space" ? spaceId : referenceId,
//           permissionGroupId: groupId,
//         }));

//         await prisma.permission.createMany({
//           data: permissionData,
//         });
//       }

//       return data<ActionData>(
//         {
//           success: true,
//           intent: intent as string,
//           message: "Permissions updated successfully",
//         },
//         { status: 200 },
//       );
//     } catch (error) {
//       return data<ActionData>(
//         {
//           success: false,
//           intent: intent as string,
//           error: "Failed to update permissions",
//         },
//         { status: 500 },
//       );
//     }
//   }

//   return data<ActionData>(
//     {
//       success: false,
//       intent: intent as string,
//       error: "Invalid intent",
//     },
//     { status: 400 },
//   );
// };

// export const loader = async ({ request, params }: LoaderFunctionArgs) => {
//   const { spaceId, groupId } = params;

//   if (!spaceId || !groupId) {
//     throw data(
//       { error: "Space ID and Group ID are required" },
//       { status: 400 },
//     );
//   }

//   const user = await hasAccessHierarchical(
//     request,
//     PERMISSION["space.view_space_settings"],
//     spaceId,
//   );

//   const spacePromise = prisma.space.findUnique({
//     where: { id: spaceId },
//     include: {
//       agents: {
//         orderBy: { name: "asc" },
//       },
//     },
//   });

//   const permissionGroupPromise = prisma.permissionGroup.findUnique({
//     where: {
//       id: groupId,
//     },
//     include: {
//       userPermissionGroups: {
//         include: {
//           user: true,
//         },
//       },
//       permissions: {
//         where: {
//           OR: [
//             {
//               referenceId: spaceId,
//               scope: { startsWith: "space." },
//             },
//             {
//               scope: { startsWith: "agent." },
//             },
//           ],
//         },
//       },
//       _count: {
//         select: {
//           userPermissionGroups: true,
//           permissions: true,
//         },
//       },
//     },
//   });

//   const [space, permissionGroup] = await Promise.all([
//     spacePromise,
//     permissionGroupPromise,
//   ]);

//   if (!space) {
//     throw data({ error: "Space not found" }, { status: 404 });
//   }

//   if (!permissionGroup) {
//     throw data({ error: "Permission group not found" }, { status: 404 });
//   }

//   // Verify this group belongs to this space
//   if (
//     permissionGroup.level !== "SPACE" ||
//     permissionGroup.spaceId !== spaceId
//   ) {
//     throw data(
//       { error: "Permission group does not belong to this space" },
//       { status: 403 },
//     );
//   }

//   const userScopes = await getUserScopes(user);

//   // Get available space permissions
//   const spacePermissions = Object.entries(AVAILABLE_PERMISSIONS)
//     .filter(([key]) => key.startsWith("space."))
//     .map(([key, value]) => ({
//       key,
//       ...value,
//     }));

//   // Get available agent permissions
//   const agentPermissions = Object.entries(AVAILABLE_PERMISSIONS)
//     .filter(([key]) => key.startsWith("agent."))
//     .map(([key, value]) => ({
//       key,
//       ...value,
//     }));

//   // Calculate inherited permissions count
//   const livePermissions = permissionGroup.permissions.map((p) => ({
//     scope: p.scope,
//     referenceId: p.referenceId,
//   }));

//   // Create space-agent mapping for this specific space
//   const spaceAgentMap = new Map<string, string[]>();
//   spaceAgentMap.set(
//     space.id,
//     space.agents.map((agent) => agent.id),
//   );

//   // Get current permissions for this group
//   const currentSpacePermissions = permissionGroup.permissions
//     .filter((p) => p.scope.startsWith("space.") && p.referenceId === spaceId)
//     .map((p) => p.scope);

//   return {
//     user: user as SessionUser,
//     space,
//     permissionGroup,
//     userScopes,
//     spacePermissions,
//     agentPermissions,
//     currentSpacePermissions,
//     livePermissions,
//     spaceAgentMap,
//   };
// };

// const PermissionEditingSection = ({
//   title,
//   permissions,
//   availablePermissions,
//   currentPermissions,
//   context,
//   referenceId,
//   checker,
//   spaceName,
//   agentName,
// }: {
//   title: string;
//   permissions: string[];
//   availablePermissions: Array<{
//     key: string;
//     name: string;
//     description: string;
//   }>;
//   currentPermissions: string[];
//   context: string;
//   referenceId: string;
//   checker: HierarchicalPermissionChecker;
//   spaceName?: string;
//   agentName?: string;
// }) => {
//   const [showInherited, setShowInherited] = useState(false);

//   const getPermissionStatus = (permission: string) => {
//     const hasDirect = currentPermissions.includes(permission);
//     const hasInherited =
//       !hasDirect && checker.hasPermission(permission, referenceId);
//     const inheritedFrom = checker
//       .inheritedFrom(permission, currentPermissions)
//       .map((p) => p.name);
//     return {
//       hasDirect,
//       hasInherited,
//       inheritedFrom,
//       hasAny: hasDirect || hasInherited,
//     };
//   };

//   const getContextIcon = (context: string) => {
//     switch (context) {
//       case "space":
//         return "🏢";
//       case "agent":
//         return "🤖";
//       default:
//         return "📋";
//     }
//   };

//   const directPermissions = availablePermissions.filter((perm) =>
//     currentPermissions.includes(perm.key),
//   );

//   const allPermissions = getAllPermissionsWithInheritance(currentPermissions);
//   console.log(allPermissions);
//   const inheritedPermissions = availablePermissions.filter((perm) => {
//     const status = getPermissionStatus(perm.key);
//     return status.hasInherited;
//   });

//   return (
//     <Card className="border-l-4 border-l-blue-500">
//       <CardHeader className="pb-3">
//         <CardTitle className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <span>{getContextIcon(context)}</span>
//             <span>{title}</span>
//             {spaceName && <Badge variant="outline">{spaceName}</Badge>}
//             {agentName && <Badge variant="outline">{agentName}</Badge>}
//           </div>
//           <div className="flex items-center gap-2">
//             <Badge variant="secondary">{directPermissions.length} direct</Badge>
//             {inheritedPermissions.length > 0 && (
//               <Badge variant="outline">
//                 {inheritedPermissions.length} inherited
//               </Badge>
//             )}
//           </div>
//         </CardTitle>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <Form method="post" className="space-y-4">
//           <input type="hidden" name="intent" value="updatePermissions" />
//           <input type="hidden" name="context" value={context} />
//           <input type="hidden" name="referenceId" value={referenceId} />

//           {/* Direct Permissions */}
//           <div>
//             <h4 className="font-medium text-sm text-muted-foreground mb-3">
//               Direct Permissions
//             </h4>
//             <div className="space-y-3">
//               {availablePermissions.map((permission) => {
//                 const isChecked = currentPermissions.includes(permission.key);
//                 return (
//                   <div
//                     key={permission.key}
//                     className="flex items-start space-x-3"
//                   >
//                     <input
//                       type="checkbox"
//                       id={`${context}-${referenceId}-${permission.key}`}
//                       name="permissions"
//                       value={permission.key}
//                       defaultChecked={isChecked}
//                       onChange={(e) => {

//                       }}
//                       className="mt-1 rounded"
//                     />
//                     <div className="flex-1">
//                       <Label
//                         htmlFor={`${context}-${referenceId}-${permission.key}`}
//                         className="cursor-pointer"
//                       >
//                         <div className="font-medium">{permission.name}</div>
//                         <div className="text-sm text-muted-foreground">
//                           {permission.description}
//                         </div>
//                       </Label>
//                     </div>
//                     {isChecked && <Check className="h-4 w-4 text-green-600" />}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           {/* Inherited Permissions */}
//           {inheritedPermissions.length > 0 && (
//             <div>
//               <button
//                 type="button"
//                 onClick={() => setShowInherited(!showInherited)}
//                 className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
//               >
//                 {showInherited ? (
//                   <ChevronDown className="h-4 w-4" />
//                 ) : (
//                   <ChevronRight className="h-4 w-4" />
//                 )}
//                 Inherited Permissions ({inheritedPermissions.length})
//               </button>

//               {showInherited && (
//                 <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
//                   {inheritedPermissions.map((permission) => {
//                     const status = getPermissionStatus(permission.key);
//                     return (
//                       <div
//                         key={permission.key}
//                         className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200"
//                       >
//                         <ArrowDown className="h-4 w-4 text-blue-600" />
//                         <div className="flex-1">
//                           <span className="text-sm font-medium">
//                             {permission.name}
//                           </span>
//                           <div className="text-xs text-blue-600">
//                             via {status.inheritedFrom.join(", ")}
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Permission Flow Visualization */}
//           {context === "agent" && (
//             <div className="pt-3 border-t">
//               <h4 className="font-medium text-sm text-muted-foreground mb-2">
//                 Permission Flow
//               </h4>
//               <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                 <span className="px-2 py-1 bg-purple-100 rounded">Global</span>
//                 <ArrowDown className="h-3 w-3" />
//                 <span className="px-2 py-1 bg-blue-100 rounded">Space</span>
//                 <ArrowDown className="h-3 w-3" />
//                 <span className="px-2 py-1 bg-green-100 rounded font-medium">
//                   Agent
//                 </span>
//               </div>
//             </div>
//           )}

//           <div className="pt-4 border-t">
//             <Button type="submit">Update {title} Permissions</Button>
//           </div>
//         </Form>
//       </CardContent>
//     </Card>
//   );
// };

// const SpacePermissionGroupDetail = () => {
//   const {
//     user,
//     space,
//     permissionGroup,
//     userScopes,
//     spacePermissions,
//     agentPermissions,
//     currentSpacePermissions,
//     livePermissions,
//     spaceAgentMap,
//   } = useLoaderData<typeof loader>();
//   const actionData = useActionData<typeof action>();
//   const [openAgents, setOpenAgents] = useState<{ [key: string]: boolean }>({});

//   // Local state for live permission updates
//   const [localLivePermissions, setLocalLivePermissions] =
//     useState<PermissionContext[]>(livePermissions);

//   useEffect(() => {
//     if (actionData && "success" in actionData && actionData.success) {
//       toast.success(actionData.message);
//       // Update local permissions after successful update
//       window.location.reload();
//     }
//     if (actionData && "error" in actionData && actionData.error) {
//       toast.error(actionData.error);
//     }
//   }, [actionData]);

//   // Create hierarchical permission checker with live permissions
//   const checker = new HierarchicalPermissionChecker(
//     localLivePermissions,
//     spaceAgentMap,
//   );

//   const toggleAgent = (agentId: string) => {
//     setOpenAgents((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
//   };

//   // Get current permissions for agents
//   const getAgentPermissions = (agentId: string) => {
//     return localLivePermissions
//       .filter((p) => p.scope.startsWith("agent.") && p.referenceId === agentId)
//       .map((p) => p.scope);
//   };

//   // Helper function to calculate permission counts for an agent
//   const getAgentPermissionCounts = (agentId: string) => {
//     const directPermissions = getAgentPermissions(agentId);
//     const directCount = directPermissions.length;

//     let inheritedCount = 0;
//     agentPermissions.forEach((permission) => {
//       const hasDirect = directPermissions.includes(permission.key);
//       const hasInherited =
//         !hasDirect && checker.hasPermission(permission.key, agentId);
//       if (hasInherited) inheritedCount++;
//     });

//     return { direct: directCount, inherited: inheritedCount };
//   };

//   return (
//     <Layout
//       navComponent={<SpaceDetailNav space={space} userScopes={userScopes} />}
//       user={user}
//     >
//       <Toaster />
//       <div className="py-8 px-4 md:p-8 w-full mx-auto">
//         <div className="mb-8">
//           <Link className="mb-4 block" to={`/space/${space.id}/permissions`}>
//             <Button variant="outline" size="sm">
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Space Permissions
//             </Button>
//           </Link>
//           <div>
//             <h1 className="text-3xl font-medium">{permissionGroup.name}</h1>
//             <p className="text-muted-foreground">
//               {permissionGroup.description}
//             </p>
//             <div className="mt-2 flex items-center gap-2">
//               <Badge variant="outline">Space Level</Badge>
//               <Badge variant="secondary">{space.name}</Badge>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
//           {/* Group Info */}
//           <div>
//             <Card className="mb-6">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Settings className="h-5 w-5" />
//                   Group Info
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-3">
//                   <div>
//                     <Label className="text-sm font-medium text-muted-foreground">
//                       Name
//                     </Label>
//                     <div className="font-medium">{permissionGroup.name}</div>
//                   </div>
//                   <div>
//                     <Label className="text-sm font-medium text-muted-foreground">
//                       Description
//                     </Label>
//                     <div className="text-sm">{permissionGroup.description}</div>
//                   </div>
//                   <div>
//                     <Label className="text-sm font-medium text-muted-foreground">
//                       Level
//                     </Label>
//                     <div className="text-sm">{permissionGroup.level}</div>
//                   </div>
//                   <div>
//                     <Label className="text-sm font-medium text-muted-foreground">
//                       Space
//                     </Label>
//                     <div className="text-sm">{space.name}</div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Users in Group */}
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Users className="h-5 w-5" />
//                   Users ({permissionGroup._count.userPermissionGroups})
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {permissionGroup.userPermissionGroups.length === 0 ? (
//                   <p className="text-muted-foreground text-sm">
//                     No users assigned to this group.
//                   </p>
//                 ) : (
//                   <div className="space-y-2">
//                     {permissionGroup.userPermissionGroups.map((upg) => (
//                       <div
//                         key={upg.id}
//                         className="flex items-center justify-between p-2 rounded border"
//                       >
//                         <div>
//                           <div className="font-medium">{upg.user.name}</div>
//                           <div className="text-sm text-muted-foreground">
//                             {upg.user.email}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </div>

//           {/* Permission Management */}
//           <div className="lg:col-span-3">
//             <div className="space-y-6">
//               {/* Space Permissions */}
//               <PermissionEditingSection
//                 title={`${space.name} Space Permissions`}
//                 permissions={currentSpacePermissions}
//                 availablePermissions={spacePermissions}
//                 currentPermissions={currentSpacePermissions}
//                 context="space"
//                 referenceId={space.id}
//                 checker={checker}
//                 spaceName={space.name}
//               />

//               {/* Agent Permissions */}
//               {space.agents.length > 0 && (
//                 <Card>
//                   <CardHeader>
//                     <CardTitle>Agent Permissions</CardTitle>
//                     <CardDescription>
//                       Manage permissions for agents within the "{space.name}"
//                       space
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-4">
//                     {space.agents.map((agent) => {
//                       const currentAgentPermissions = getAgentPermissions(
//                         agent.id,
//                       );
//                       const agentCounts = getAgentPermissionCounts(agent.id);

//                       return (
//                         <div key={agent.id}>
//                           <button
//                             onClick={() => toggleAgent(agent.id)}
//                             className="flex items-center justify-between w-full p-3 text-left bg-blue-50 rounded-lg hover:bg-blue-100"
//                           >
//                             <div className="flex items-center gap-2">
//                               {openAgents[agent.id] ? (
//                                 <ChevronDown className="h-4 w-4" />
//                               ) : (
//                                 <ChevronRight className="h-4 w-4" />
//                               )}
//                               <span className="font-medium">{agent.name}</span>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <Badge variant="secondary" className="text-xs">
//                                 {agentCounts.direct} direct
//                               </Badge>
//                               <Badge variant="outline" className="text-xs">
//                                 {agentCounts.inherited} inherited
//                               </Badge>
//                             </div>
//                           </button>
//                           {openAgents[agent.id] && (
//                             <div className="pt-4">
//                               <PermissionEditingSection
//                                 title={`${agent.name} Agent Permissions`}
//                                 permissions={currentAgentPermissions}
//                                 availablePermissions={agentPermissions}
//                                 currentPermissions={currentAgentPermissions}
//                                 context="agent"
//                                 referenceId={agent.id}
//                                 checker={checker}
//                                 spaceName={space.name}
//                                 agentName={agent.name}
//                               />
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })}
//                   </CardContent>
//                 </Card>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </Layout>
//   );
// };

// export default SpacePermissionGroupDetail;

// export const meta: MetaFunction<typeof loader> = ({ data }) => {
//   return [
//     {
//       title: `${data?.permissionGroup?.name} - ${data?.space?.name} | OAK Dashboard`,
//     },
//     { name: "description", content: "Manage permission group settings" },
//   ];
// };
