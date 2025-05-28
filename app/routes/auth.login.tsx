import {
  Form,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useState } from "react";
import { authClient } from "~/lib/auth/auth.client";
import { sessionStorage } from "~/lib/sessions.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const error = session.get("error");
  const invite = session.get("invite");

  const hasGoogleCredentials =
    process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_ID;

  return { invite, error, hasGoogleCredentials };
};

export default function Screen() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await authClient.signIn.email(
      {
        email: formData.email,
        password: formData.password,
      },
      {
        onRequest: () => {
          setError(undefined);
        },
        onSuccess: () => {
          navigate("/");
        },
        onError: (ctx) => {
          setError(ctx.error.message);
        },
      },
    );
  };

  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
    });
  };

  const {
    invite,
    error: loaderError,
    hasGoogleCredentials,
  } = useLoaderData<typeof loader>();
  const errorMessage = error || loaderError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="container relative min-h-screen flex-col items-center justify-center grid grid-cols-1 lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-zinc-800" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <div className="rounded-md overflow-hidden">
              <img
                src="/assets/logo.svg"
                alt="OAK - Open Agent Kit"
                className="w-12"
              />
            </div>
            <span className="text-4xl ml-4">Welcome to OAK</span>
          </div>
          <div className="relative z-20 mt-auto text-xl max-w-lg">
            The Enterprise Platform for Building and Deploying Custom AI Agents
            - Your Way
          </div>
        </div>

        <div className="w-full max-w-md p-8 space-y-6 mx-auto col-span-1 border rounded-md bg-zinc-100">
          <div className="flex justify-center">
            <div className="rounded-xl overflow-hidden lg:hidden">
              <img
                src="/assets/logo.svg"
                alt="OAK - Open Agent Kit"
                className="w-12"
              />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-medium">Welcome back</h1>
            <p className="text-gray-500">Sign in to continue</p>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="mode" value="login" />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                defaultValue={invite?.email}
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
            </div>

            <Button className="w-full" type="submit">
              Sign in
            </Button>
          </Form>

          {hasGoogleCredentials && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 text-gray-500">or</span>
                </div>
              </div>
              <Form onSubmit={handleGoogleLogin}>
                <Button className="w-full" variant="outline" type="submit">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                  </svg>
                  Sign in with Google
                </Button>
              </Form>
            </>
          )}

          <div className="flex flex-col space-y-2 mt-8">
            <div className="text-center">
              <a
                href="/auth/resetpassword"
                className="text-sm text-gray-500 hover:text-gray-900 underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="text-center text-sm text-gray-500">
              <a
                href="/auth/register"
                className="hover:text-gray-900 underline"
              >
                Don&apos;t have an account? Register here
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
