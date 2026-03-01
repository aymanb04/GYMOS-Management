export default function AuthLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    // Layout is handled per-page since left panel content differs
    // between login and signup. This just ensures the font is available.
    return <>{children}</>;
}