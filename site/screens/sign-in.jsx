/* St. John the Beloved test site · Sign in (#/sign-in): the parish office's sign-in, a page of its own without the site
   header or navigation (its chrome is null). An AuthenticationPage holds the Auth card and one step at a time: SignInForm
   (with SsoButtons for Google, Microsoft and the diocese's single sign-on), the two-step code (MfaChallenge), creating an
   office account (SignUpForm), a forgotten password (PasswordResetForm), account recovery with a backup code
   (AccountRecovery), and the welcome desk's tablet, which signs in with a 4-digit PIN (OtpInput). Every account here is
   made up: any password of 8 characters or more signs in, and the code 000000 is always wrong. */
import { AccountRecovery, AuthenticationPage, Button, Field, Inline, Link, MfaChallenge, OtpInput, PasswordResetForm, SignInForm, SignUpForm,
  SsoButtons, Stack, Text, useToast } from 'plenix-platform';
import { CHURCH } from '../data.js';
const { useState } = React;

const TITLES = {
  signin: ['Sign in to the parish office', 'Use your office email or user name.'],
  mfa: ['Two-step verification', 'Enter the code that confirms it is you.'],
  signup: ['Create an office account', 'For servants the parish priest has asked to help in the office.'],
  reset: ['Reset your password', 'We email you a link to choose a new one.'],
  recovery: ['Recover your account', 'When your phone or authenticator app is not with you.'],
  desk: ['Welcome desk', 'The tablet at the church entrance signs in with the desk PIN.'],
};
const METHODS = [
  { id: 'app', kind: 'app', label: 'Authenticator app' },
  { id: 'sms', kind: 'sms', label: 'Text message', detail: 'to the phone ending 44' },
  { id: 'email', kind: 'email', label: 'Email', detail: 'to o•••@stjohn-beloved.example' },
];

export function SignInScreen({ screen, chrome }) {
  const toast = useToast();
  const [view, setView] = useState('signin');
  const [error, setError] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState('');
  const [codeError, setCodeError] = useState('');
  const [recovered, setRecovered] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const go = (v) => { setError(''); setCodeError(''); setView(v); };
  const later = (fn) => { setBusy(true); setTimeout(() => { setBusy(false); fn(); }, 500); };
  const toSignIn = { onClick: () => go('signin'), label: 'Back to sign in' };

  const signIn = ({ identifier: id, password }) => {
    setIdentifier(id);
    later(() => { if (password.length < 8) setError('Email or password is incorrect.'); else go('mfa'); });
  };
  const verify = (code) => later(() => { if (code === '000000') setCodeError('That code is wrong or has expired. Enter the newest one.'); else screen.navigate('/welcome', { first: '1' }); });
  const provider = (p) => { setRedirecting(p.label); setTimeout(() => screen.navigate('/'), 900); };

  const forms = {
    signin: <SignInForm onSubmit={signIn} error={error || undefined} defaultIdentifier={identifier} busy={busy} keepDescription="Only on the office computers, never on your own phone."
      forgot={{ onClick: () => go('reset') }} signUp={{ onClick: () => go('signup') }}
      sso={<SsoButtons providers={[{ id: 'google', label: 'Google' }, { id: 'microsoft', label: 'Microsoft' }]} onProvider={provider} redirecting={redirecting || undefined}
        organization onOrganization={(email) => provider({ id: 'diocese', label: 'the diocese (' + email.split('@').pop() + ')' })} />} />,
    mfa: <MfaChallenge methods={METHODS} onVerify={verify} onResend={(m) => toast.show('A new code was sent ' + (m.detail || ''))} error={codeError || undefined} busy={busy}
      autoFocus recovery={{ onClick: () => go('recovery') }} />,
    signup: <SignUpForm busy={busy} signIn={toSignIn}
      terms={<>I will keep members’ information private, as the <Link href="#/document/d4">servant guidelines</Link> ask</>}
      onSubmit={({ name }) => later(() => { toast.show('Thank you, ' + name.split(' ')[0] + '. The parish priest will approve your account.', { tone: 'success' }); go('signin'); })} />,
    reset: <PasswordResetForm expires="30 minutes" busy={busy} signIn={toSignIn} strings={{ emailHint: 'The email of your ' + CHURCH.brand + ' account.' }}
      onRequest={() => undefined} onResend={() => toast.show('We sent the link again')}
      onReset={() => toast.show('Your password was changed', { tone: 'success' })} />,
    recovery: <AccountRecovery key={recovered ? 'done' : 'ask'} defaultStep={recovered ? 'done' : 'choose'} busy={busy} error={recoveryError || undefined}
      admin={'The church office, ' + CHURCH.phone} back={toSignIn} onFactor={() => go('mfa')} onSetUp={() => go('mfa')}
      onCode={(code) => later(() => { if (/^\d{4}-?\d{4}$/.test(code)) { setRecoveryError(''); setRecovered(true); } else setRecoveryError('Enter a backup code like 1234-5678.'); })} />,
    desk: (
      <Stack gap="md">
        <Field label="Desk PIN" description="Four digits, from the church office. The desk only opens the visitor cards and the sign-up sheets." error={pinError || undefined}>
          <OtpInput length={4} masked value={pin} onChange={(v) => { setPin(v); setPinError(''); }} autoFocus
            onComplete={(v) => { if (v === '1904') screen.navigate('/servants'); else { setPinError('That PIN is not right. Ask the church office.'); setPin(''); } }} />
        </Field>
        <Button variant="ghost" onClick={() => go('signin')}>Back to sign in</Button>
      </Stack>
    ),
  };
  const [title, description] = TITLES[view];
  return (
    <AuthenticationPage {...chrome} auth={{ page: true, title, description,
      footer: (
        <Stack gap="xs">
          <Inline wrap gap="md" justify="center">
            <Link href="#/visit" variant="subtle">Visit {CHURCH.short}</Link>
            {view !== 'desk' ? <Button size="sm" variant="ghost" onClick={() => go('desk')}>Welcome desk sign-in</Button> : null}
          </Inline>
          <Text variant="caption">Test site: every account and person here is made up.</Text>
        </Stack>
      ) }} form={forms[view]} />
  );
}
