import {
  Form,
  Link,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { sessionStorage } from "~/lib/sessions.server";
import { authClient } from "~/lib/auth/auth.client";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const hasGoogleCredentials =
    process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_ID;
  const invite = session.get("invite");
  return { invite, hasGoogleCredentials };
};

export default function Screen() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    await authClient.signUp.email(
      {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        callbackURL: "/",
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

  const handleGoogleSignup = async () => {
    await authClient.signIn.social({
      provider: "google",
    });
  };

  const { invite, hasGoogleCredentials } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="container relative min-h-screen flex-col items-center justify-center grid grid-cols-1 lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <div className="rounded-xl overflow-hidden">
              <img
                src="/assets/logo.svg"
                alt="OAK - Open Agent Kit"
                className="w-12"
              />
            </div>
            <span className="text-4xl ml-4">Open Agent Kit</span>
          </div>
          <div className="relative z-20 mt-auto text-xl">
            Building and Deploying Custom AI Agents - Your Way
          </div>
        </div>

        <div className="w-full max-w-md mx-auto p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-medium">Create Your Account</h1>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={invite?.email}
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
              />
            </div>

            <Button className="w-full" type="submit">
              Create Account
            </Button>
          </Form>

          {hasGoogleCredentials && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>
              <Form onSubmit={handleGoogleSignup}>
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

          <div className="text-center text-sm text-gray-500">
            <Link to="/auth/login" className=" hover:text-gray-900 underline">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
