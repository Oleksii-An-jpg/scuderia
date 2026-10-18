"use client";

import {useState, useEffect, useRef, useCallback} from "react";
import { auth } from "@/lib/firebase";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    ConfirmationResult,
} from "firebase/auth";
import {createSession} from "@/app/actions";
import {AbsoluteCenter, Box, Button, Container, InputGroup, VStack, Alert, Field, Input, Separator, PinInput} from "@chakra-ui/react";
import {useForm, Controller} from "react-hook-form";
import {useBoolean} from "usehooks-ts";
import {BiLogoGoogle} from "react-icons/bi";

type Values = {
    phoneNumber: string;
    code: string[];
}

const CODE_LENGTH = 6;
const COUNTRY_CODE = "+380";
const UA_PHONE = /^\+380\d{9}$/;

// Firebase only accepts E.164, and every rejected number still counts towards
// the per-IP/per-number quota, so normalize before hitting the network.
// The field sits behind a fixed +380 prefix, but people still type the number
// the way they know it: 501234567, 0501234567, 380501234567 or +380 50 123 45 67.
function normalizePhoneNumber(raw: string): string | null {
    let digits = raw.replace(/\D/g, '');

    if (digits.startsWith('380')) {
        digits = digits.slice(3);
    } else if (digits.startsWith('0')) {
        digits = digits.slice(1);
    }

    const normalized = `${COUNTRY_CODE}${digits}`;

    return UA_PHONE.test(normalized) ? normalized : null;
}

const AUTH_ERRORS: Record<string, { title: string; description: string }> = {
    'auth/too-many-requests': {
        title: "Забагато спроб",
        description: "Забагато запитів на цей номер або з цієї мережі. Зачекайте 15–30 хвилин або скористайтесь входом через Ґуґл.",
    },
    'auth/quota-exceeded': {
        title: "Ліміт СМС вичерпано",
        description: "Денний ліміт СМС вичерпано. Скористайтесь входом через Ґуґл або зверніться до адміністратора.",
    },
    'auth/invalid-phone-number': {
        title: "Невірний номер",
        description: "Перевірте номер телефону. Формат: +380XXXXXXXXX.",
    },
    'auth/missing-phone-number': {
        title: "Невірний номер",
        description: "Вкажіть номер телефону у форматі +380XXXXXXXXX.",
    },
    'auth/invalid-verification-code': {
        title: "Невірний код",
        description: "Код із СМС не підходить. Перевірте його або надішліть новий.",
    },
    'auth/code-expired': {
        title: "Код застарів",
        description: "Термін дії коду вичерпано. Надішліть новий код на номер.",
    },
    'auth/captcha-check-failed': {
        title: "Перевірку не пройдено",
        description: "Перевірка reCAPTCHA не вдалася. Оновіть сторінку та спробуйте ще раз.",
    },
    'auth/network-request-failed': {
        title: "Немає зв'язку",
        description: "Не вдалося зв'язатися з сервером. Перевірте інтернет і спробуйте ще раз.",
    },
    'auth/popup-closed-by-user': {
        title: "Вхід скасовано",
        description: "Вікно входу через Ґуґл було закрито.",
    },
};

// Server actions redirect by throwing - that must not be swallowed as a login error.
function isRedirectError(err: unknown): boolean {
    const digest = (err as { digest?: unknown })?.digest;
    return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

function describeError(err: unknown): { type: string; message: string } {
    const code = (err as { code?: string })?.code;
    const known = code ? AUTH_ERRORS[code] : undefined;

    if (known) {
        return { type: known.title, message: known.description };
    }

    // An error thrown inside a server action reaches the browser stripped of its
    // message and its code - only the digest survives. Showing the digest is the
    // difference between 'unknown' and a string that finds the real error in the
    // server log.
    const digest = (err as { digest?: unknown })?.digest;

    if (!code && typeof digest === 'string') {
        return {
            type: "Помилка на сервері",
            message: `Вхід виконано, але не вдалося створити сесію. Покажіть адміністратору код: ${digest}`,
        };
    }

    // Errors from outside Firebase Auth (reCAPTCHA, the browser) carry no code,
    // so fall back to the message - 'unknown' tells nobody anything.
    const detail = code ?? (err instanceof Error && err.message ? err.message : 'unknown');

    return {
        type: "Помилка входу",
        message: `Не вдалося увійти. Код помилки: ${detail}`,
    };
}

export default function Auth() {
    const { register, watch, control, setError, reset, clearErrors, handleSubmit, formState: { errors } } = useForm<Values>()
    const [phoneNumber, code] = watch(['phoneNumber', 'code'])
    const [conf, setConf] = useState<ConfirmationResult | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const verifierRef = useRef<{ verifier: RecaptchaVerifier; element: HTMLElement } | null>(null);
    const { value: loading, setTrue, setFalse } = useBoolean();
    // Off until the stale Firebase sign-in (if any) has been dropped, so a login
    // cannot start and then be wiped out by that sign-out.
    const { value: ready, setTrue: setReady } = useBoolean();

    const clearVerifier = useCallback(() => {
        const current = verifierRef.current;
        if (!current) return;

        verifierRef.current = null;
        try {
            current.verifier.clear();
        } catch (err) {
            console.error("Error clearing RecaptchaVerifier:", err);
        }
        // clear() leaves an invisible widget's DOM in place, and reCAPTCHA refuses
        // to render twice into the same element - so every verifier gets its own
        // element, removed here.
        current.element.remove();
    }, []);

    // A reCAPTCHA token is single-use and expires ~2 minutes after render, so it
    // is built per request instead of on mount: a stale token is rejected by
    // Firebase and repeated rejections trip the auth/too-many-requests throttle.
    const createVerifier = useCallback(async () => {
        clearVerifier();

        const element = document.createElement('div');
        containerRef.current?.appendChild(element);

        const verifier = new RecaptchaVerifier(auth, element, {
            size: "invisible",
        });
        verifierRef.current = { verifier, element };
        await verifier.render();

        return verifier;
    }, [clearVerifier]);

    // Drop any live widget on unmount
    useEffect(() => {
        return () => clearVerifier();
    }, [clearVerifier]);

    // The page only renders without a valid server session (see auth/page.tsx),
    // so a Firebase user still remembered by the browser is left over from an
    // expired or revoked session. Drop it, so the form starts from a clean slate.
    useEffect(() => {
        signOut(auth)
            .catch((err) => console.error("Error clearing stale sign-in:", err))
            .finally(setReady);
    }, [setReady]);

    async function handleGoogleLogin() {
        setTrue();
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken(true);
            await createSession(token);
        } catch (err) {
            if (isRedirectError(err)) throw err;
            console.error("Google login error:", err);
            setError('root', describeError(err));
        } finally {
            setFalse();
        }
    }

    async function handleSendCode() {
        const normalized = normalizePhoneNumber(phoneNumber ?? '');

        if (!normalized) {
            setError('root', {
                type: AUTH_ERRORS['auth/invalid-phone-number'].title,
                message: AUTH_ERRORS['auth/invalid-phone-number'].description,
            });
            return;
        }

        setTrue();

        try {
            const verifier = await createVerifier();
            const confirmation = await signInWithPhoneNumber(auth, normalized, verifier);
            setConf(confirmation);
            clearErrors();
        } catch (err) {
            console.error("Send code error:", err);
            setError('root', describeError(err));
        } finally {
            // The token is spent on success and untrustworthy on failure - never reuse it.
            clearVerifier();
            setFalse();
        }
    }

    async function confirmCode(verificationCode: string) {
        // Auto-submit fires on every completion, so ignore a code that arrives
        // while a confirmation is already in flight.
        if (!conf || loading) return;

        setTrue();

        try {
            const result = await conf.confirm(verificationCode);
            const token = await result.user.getIdToken(true);
            await createSession(token);
            reset();
            clearErrors();
        } catch (err) {
            if (isRedirectError(err)) throw err;
            console.error("Confirm code error:", err);

            // An expired code is unusable - send the user back to the send-code step.
            if ((err as { code?: string })?.code === 'auth/code-expired') {
                setConf(null);
            }

            setError('root', describeError(err));
        } finally {
            setFalse();
        }
    }

    const handleConfirmCode = handleSubmit((data) => confirmCode(data.code.join('')));

    const enteredCode = code?.join('') ?? '';

    return <Box position="relative" h="100vh" w="full">
        <div ref={containerRef} />
        <AbsoluteCenter>
            <Container maxW="xl">
                <VStack gap={8}>
                    {errors.root && (
                        <Alert.Root status="error">
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title>{errors.root.type}</Alert.Title>
                                <Alert.Description>
                                    {errors.root.message}
                                </Alert.Description>
                            </Alert.Content>
                        </Alert.Root>
                    )}

                    <VStack>
                        <form className="w-full" onSubmit={(e) => e.preventDefault()}>
                            {/* PHONE INPUT */}
                            <VStack align="stretch" gap={4}>
                                <Field.Root
                                    required
                                    disabled={loading || !!conf}
                                    invalid={!!errors.phoneNumber}
                                    orientation="horizontal"
                                >
                                    <Field.Label>Телефон</Field.Label>
                                    <InputGroup startElement="+380">
                                        <Input
                                            ps="6ch"
                                            type="tel"
                                            placeholder="501234567"
                                            {...register('phoneNumber')}
                                        />
                                    </InputGroup>
                                    <Field.ErrorText>{errors.phoneNumber?.message}</Field.ErrorText>
                                </Field.Root>
                                <Field.Root disabled={!conf} orientation="horizontal" invalid={!!errors.code}>
                                    <Field.Label>Код (смс)</Field.Label>
                                    <Controller
                                        control={control}
                                        name="code"
                                        render={({ field }) => (
                                            <PinInput.Root
                                                otp
                                                w="full"
                                                value={field.value}
                                                onValueChange={(e) => field.onChange(e.value)}
                                                onValueComplete={(e) => confirmCode(e.valueAsString)}
                                            >
                                                <PinInput.HiddenInput />
                                                <PinInput.Control>
                                                    <PinInput.Input index={0} />
                                                    <PinInput.Input index={1} />
                                                    <PinInput.Input index={2} />
                                                    <PinInput.Input index={3} />
                                                    <PinInput.Input index={4} />
                                                    <PinInput.Input index={5} />
                                                </PinInput.Control>
                                            </PinInput.Root>
                                        )}
                                    />
                                    <Field.ErrorText>{errors.code?.message}</Field.ErrorText>
                                </Field.Root>
                                <Button
                                    type="button"
                                    colorPalette="blue"
                                    loading={loading}
                                    loadingText={conf ? 'Входимо' : 'Надсилаємо'}
                                    onClick={conf ? handleConfirmCode : handleSendCode}
                                    disabled={!ready || loading || !phoneNumber || Boolean(conf && enteredCode.length < CODE_LENGTH)}
                                >
                                    {conf ? 'Увійти' : "Надіслати код на номер"}
                                </Button>
                            </VStack>
                        </form>

                        <Separator />

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoogleLogin}
                            disabled={!ready || loading}
                        >
                            <BiLogoGoogle />
                            Зайти через Ґуґл
                        </Button>
                    </VStack>
                </VStack>
            </Container>
        </AbsoluteCenter>
    </Box>
}
