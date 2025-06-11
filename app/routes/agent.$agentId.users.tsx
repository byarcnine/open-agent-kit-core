// import {
//   Form,
//   useLoaderData,
//   useActionData,
//   useFetcher,
//   data,
//   type LoaderFunctionArgs,
//   type ActionFunctionArgs,
// } from "react-router";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "~/components/ui/table";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// import { prisma, type AgentUserRole } from "@db/db.server";
// import { Button } from "~/components/ui/button";
// import { Trash2 } from "react-feather";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "~/components/ui/select";
// import { useEffect } from "react";
// import { toast } from "sonner";
// import { Toaster } from "~/components/ui/sonner";
// import { InviteUserModal } from "~/components/inviteUserModal/inviteUserModal";
// import NoDataCard from "~/components/ui/no-data-card";
// import { APP_URL } from "~/lib/config/config";
// import CopyToClipboardLink from "~/components/copyToClipboardLink/copyToClipboardLink";
// import { getUserAgentRole } from "~/lib/auth/hasAccess.server";
// import { createInvitation } from "~/lib/auth/handleInvite.server";
// import { AGENT_ROLES } from "~/lib/auth/roles";
// import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
// import { PERMISSION } from "~/lib/permissions/permissions";

// dayjs.extend(relativeTime);

// export const loader = async ({ request, params }: LoaderFunctionArgs) => {
//   const agentId = params.agentId as string;
//   const user = await hasAccessHierarchical(
//     request,
//     PERMISSION["agent.edit_agent"],
//     agentId,
//   );
//   const users = await prisma.agentUser.findMany({
//     where: { agentId },
//     include: { user: true },
//   });
//   const userAgentRole = await getUserAgentRole(user, agentId);
//   const invitations = await prisma.invitation
//     .findMany({
//       where: { agentId },
//     })
//     .then((invitations) => {
//       return invitations.map((invitation) => {
//         return {
//           ...invitation,
//           link: `${APP_URL()}/invite/${invitation.id}`,
//         };
//       });
//     });
//   return {
//     users,
//     invitations,
//     userAgentRole,
//     userId: user.id,
//     isSuperAdmin: user.role === "SUPER_ADMIN",
//   };
// };

// export const action = async ({ request, params }: ActionFunctionArgs) => {
//   const agentId = params.agentId as string;
//   const formData = await request.formData();
//   const intent = formData.get("intent");
//   // only owners can manage users
//   const user = await hasAccessHierarchical(
//     request,
//     PERMISSION["agent.edit_agent"],
//     agentId,
//   );
//   if (intent === "delete") {
//     const userId = formData.get("userId");
//     if (typeof userId !== "string") {
//       return data({ error: "Invalid userId", success: false }, { status: 400 });
//     }
//     await prisma.agentUser.delete({
//       where: { userId_agentId: { userId, agentId } },
//     });
//     return data({ success: true, error: null });
//   }

//   if (intent === "invite") {
//     const email = formData.get("email");
//     const role = formData.get("role");
//     if (typeof email !== "string" || typeof role !== "string") {
//       return data(
//         { error: "Invalid email or role", success: false },
//         { status: 400 },
//       );
//     }

//     try {
//       return createInvitation(email, agentId, role as AgentUserRole);
//     } catch (error) {
//       console.error("Invitation error:", error);
//       return data(
//         {
//           error: "Failed to create invitation. Please try again.",
//           success: false,
//         },
//         { status: 500 },
//       );
//     }
//   }

//   if (intent === "updateRole") {
//     const userId = formData.get("userId");
//     const role = formData.get("role");
//     const userAgentRole = await getUserAgentRole(user, agentId);
//     const userThatIsBeingUpdated = await prisma.user.findUnique({
//       where: { id: userId as string },
//     });
//     if (user.id === userId) {
//       return data(
//         { error: "You cannot update your own role", success: false },
//         { status: 400 },
//       );
//     }
//     if (!userThatIsBeingUpdated) {
//       return data({ error: "User not found", success: false }, { status: 400 });
//     }
//     const updatedUserRole = await getUserAgentRole(
//       userThatIsBeingUpdated,
//       agentId,
//     );
//     if (updatedUserRole === "OWNER" && user.role !== "SUPER_ADMIN") {
//       return data(
//         { error: "You cannot update the role of an owner", success: false },
//         { status: 400 },
//       );
//     }
//     if (role === "OWNER" && userAgentRole !== "OWNER") {
//       return data(
//         {
//           error: "You cannot set an owner if you are not an owner",
//           success: false,
//         },
//         { status: 400 },
//       );
//     }

//     if (typeof userId !== "string" || typeof role !== "string") {
//       return data(
//         { error: "Invalid userId or role", success: false },
//         { status: 400 },
//       );
//     }

//     await prisma.agentUser.update({
//       where: { userId_agentId: { userId, agentId } },
//       data: { role: role as AgentUserRole },
//     });
//     return { success: true, error: null };
//   }

//   return data({ error: "Invalid intent", success: false }, { status: 400 });
// };

// const AgentUsersView = () => {
//   const { users, invitations, userAgentRole, userId, isSuperAdmin } =
//     useLoaderData<typeof loader>();
//   const actionData = useActionData<typeof action>();
//   const roleFetcher = useFetcher();

//   useEffect(() => {
//     if (roleFetcher.data) {
//       toast.success("Role updated successfully");
//     }
//   }, [roleFetcher.data]);

//   return (
//     <div className="py-8 px-4 md:p-8 w-full">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-3xl font-medium">Users</h1>
//         <InviteUserModal
//           roles={AGENT_ROLES.filter(
//             (role) => userAgentRole === "OWNER" || role.name !== "OWNER", // only owners can set others as owners
//           )}
//           error={actionData?.error}
//         />
//       </div>

//       {(!users || users.length === 0) && (
//         <NoDataCard headline="" description="No users found for this agent.">
//           <InviteUserModal
//             roles={AGENT_ROLES.filter(
//               (role) => userAgentRole === "OWNER" || role.name !== "OWNER", // only owners can set others as owners
//             )}
//             error={actionData?.error}
//           />
//         </NoDataCard>
//       )}
//       {users && users.length > 0 && (
//         <div className="rounded-md border">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Name</TableHead>
//                 <TableHead>Email</TableHead>
//                 <TableHead>Role</TableHead>
//                 <TableHead>Actions</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {users.map((user) => {
//                 return (
//                   <TableRow key={user.user.id}>
//                     <TableCell className="font-medium">
//                       {user.user.name}
//                     </TableCell>
//                     <TableCell className="font-medium">
//                       {user.user.email}
//                     </TableCell>
//                     <TableCell>
//                       <roleFetcher.Form method="post" className="w-32">
//                         <input
//                           type="hidden"
//                           name="userId"
//                           value={user.user.id}
//                         />
//                         <input type="hidden" name="intent" value="updateRole" />
//                         <Select
//                           name="role"
//                           // can't change owner role or your own role
//                           disabled={
//                             (user.role === "OWNER" ||
//                               user.user.id === userId) &&
//                             !isSuperAdmin
//                           }
//                           defaultValue={user.role}
//                           onValueChange={(value) => {
//                             roleFetcher.submit(
//                               {
//                                 userId: user.user.id,
//                                 role: value,
//                                 intent: "updateRole",
//                               },
//                               { method: "post" },
//                             );
//                           }}
//                         >
//                           <SelectTrigger>
//                             <SelectValue placeholder="Select a role" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem
//                               disabled={
//                                 userAgentRole !== "OWNER" && !isSuperAdmin
//                               }
//                               value="OWNER"
//                             >
//                               Owner
//                             </SelectItem>
//                             <SelectItem value="EDITOR">Editor</SelectItem>
//                             <SelectItem value="VIEWER">Viewer</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </roleFetcher.Form>
//                     </TableCell>
//                     <TableCell>
//                       {userAgentRole === "OWNER" && (
//                         <Form method="post">
//                           <input
//                             type="hidden"
//                             name="userId"
//                             value={user.user.id}
//                           />
//                           <input type="hidden" name="intent" value="delete" />
//                           <Button
//                             className="p-2"
//                             variant="destructive"
//                             type="submit"
//                           >
//                             <Trash2 />
//                           </Button>
//                         </Form>
//                       )}
//                     </TableCell>
//                   </TableRow>
//                 );
//               })}
//             </TableBody>
//           </Table>
//         </div>
//       )}
//       <Toaster />
//       {invitations.length > 0 && (
//         <>
//           <h2 className="mt-8 mb-4 text-lg font-medium">Invites</h2>
//           <div className="rounded-md border">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Email</TableHead>
//                   <TableHead>Date</TableHead>
//                   <TableHead>Invite Link</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {invitations.map((invite) => (
//                   <TableRow key={invite.id}>
//                     <TableCell className="font-medium">
//                       {invite.email}
//                     </TableCell>
//                     <TableCell className="font-medium">
//                       {dayjs(invite.createdAt).format("MM/DD/YYYY")}
//                     </TableCell>
//                     <TableCell className="font-medium w-100">
//                       <CopyToClipboardLink link={invite.link} />
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default AgentUsersView;
