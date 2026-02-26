import Footer from "@/app/_landing/footer";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
