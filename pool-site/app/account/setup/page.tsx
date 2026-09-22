import SignInForm from '../../signin/form';
export const dynamic = 'force-dynamic';
export const metadata = {robots: {index: false, follow: false}, referrer: 'no-referrer'};
export default async function Page({searchParams}: {searchParams: Promise<{token?: string; email?: string}>}) {
  const params = await searchParams;
  return <SignInForm setup token={params.token || ''} initialEmail={params.email || ''}/>;
}
