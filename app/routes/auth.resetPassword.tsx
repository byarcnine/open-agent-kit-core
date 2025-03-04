import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { authClient } from "~/lib/auth/auth.client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (token && email) {
    return { token, email, mode: "reset" };
  }

  return { mode: "request" };
};

export default function Screen() {
  const actionData = useActionData<{ error?: string; success?: string }>();
  const { token, email, mode } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const handleResetPassword = async (formElement: React.FormEvent) => {
    formElement.preventDefault();
    const formData = new FormData(formElement.target as HTMLFormElement);
    if (mode === "reset") {
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;
      if (password !== confirmPassword) {
        return { error: "Passwords do not match" };
      }
      await authClient.resetPassword({
        token,
        newPassword: password,
      });
      navigate("/");
    } else if (mode === "request") {
      const email = formData.get("email") as string;
      await authClient.forgetPassword({
        email,
        redirectTo: `/auth/resetPassword?email=${email}`,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">
            {mode === "reset" ? "Reset Password" : "Request Password Reset"}
          </h1>
          <p className="text-gray-500">
            {mode === "reset"
              ? "Create a new password for your account"
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {actionData?.error && (
          <Alert variant="destructive">
            <AlertDescription>{actionData.error}</AlertDescription>
          </Alert>
        )}

        {actionData?.success && (
          <Alert>
            <AlertDescription>{actionData.success}</AlertDescription>
          </Alert>
        )}

        <Form onSubmit={handleResetPassword} className="space-y-4">
          <input type="hidden" name="mode" value={mode} />
          {token && <input type="hidden" name="token" value={token} />}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={email || ""}
              readOnly={mode === "reset"}
              disabled={mode === "reset"}
              placeholder="Enter your email address"
            />
          </div>

          {mode === "reset" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Enter your new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="Confirm your new password"
                />
              </div>
            </>
          )}

          <Button className="w-full" type="submit">
            {mode === "reset" ? "Reset Password" : "Send Reset Link"}
          </Button>
        </Form>

        <div className="text-center text-sm text-gray-500">
          Remember your password?{" "}
          <Link
            to="/auth/login"
            className="font-semibold text-gray-900 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
