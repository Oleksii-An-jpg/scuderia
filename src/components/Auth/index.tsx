"use client";

import {useState, useEffect, useRef, useCallback} from "react";
import { auth } from "@/lib/firebase";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    User,
    ConfirmationResult,
} from "firebase/auth";
import {createSession, deleteSession} from "@/app/actions";
import {AbsoluteCenter, Box, Button, Container, InputGroup, VStack, Alert, Field, Input, Separator, PinInput, Text} from "@chakra-ui/react";
import {useForm, Controller} from "react-hook-form";
import {useBoolean} from "usehooks-ts";
import {BiLogoGoogle} from "react-icons/bi";

type Values = {
    phoneNumber: string;
    code: string[];
}

const CODE_LENGTH = 6;
const DEFAULT_COUNTRY_CODE = "+380";
const E164 = /^\+[1-9]\d{7,14}$/;

// Firebase only accepts E.164, and every rejected number still counts towards
// the per-IP/per-number quota, so normalize before hitting the network.
function normalizePhoneNumber(raw: string): string | null {
    const trimmed = raw.trim();
    const digits = trimmed.replace(/\D/g, '');

    if (!digits) return null;

    let normalized: string;
    if (trimmed.startsWith('+')) {
        normalized = `+${digits}`;
    } else if (digits.startsWith('380')) {
        normalized = `+${digits}`;
    } else if (digits.startsWith('0')) {
        normalized = `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
    } else {
        normalized = `${DEFAULT_COUNTRY_CODE}${digits}`;
    }

    return E164.test(normalized) ? normalized : null;
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

    return {
        type: "Помилка входу",
        message: `Не вдалося увійти. Код помилки: ${code ?? 'unknown'}`,
    };
}

export default function Auth() {
    const { register, watch, control, setError, reset, clearErrors, handleSubmit, formState: { errors } } = useForm<Values>()
    const [phoneNumber, code] = watch(['phoneNumber', 'code'])
    const [user, setUser] = useState<User | null>(null);
    const [conf, setConf] = useState<ConfirmationResult | null>(null);
    const verifierRef = useRef<RecaptchaVerifier | null>(null);
    const { value: loading, setTrue, setFalse } = useBoolean();

    const clearVerifier = useCallback(() => {
        if (verifierRef.current) {
            try {
                verifierRef.current.clear();
            } catch (err) {
                console.error("Error clearing RecaptchaVerifier:", err);
            }
            verifierRef.current = null;
        }
    }, []);

    // A reCAPTCHA token is single-use and expires ~2 minutes after render, so it
    // is built per request instead of on mount: a stale token is rejected by
    // Firebase and repeated rejections trip the auth/too-many-requests throttle.
    const createVerifier = useCallback(async () => {
        clearVerifier();

        const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
        });
        await verifier.render();
        verifierRef.current = verifier;

        return verifier;
    }, [clearVerifier]);

    // Drop any live widget on unmount
    useEffect(() => {
        return () => clearVerifier();
    }, [clearVerifier]);

    // Watch Firebase auth
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsub();
    }, []);

    async function handleGoogleLogin() {
        setTrue();
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken(true);
            await createSession(token);
            setUser(result.user);
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

    const handleConfirmCode = handleSubmit(async (data) => {
        if (!conf) return;

        setTrue();

        try {
            const result = await conf.confirm(data.code.join(''));
            const token = await result.user.getIdToken(true);
            await createSession(token);
            setUser(result.user);
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
    });

    async function handleLogout() {
        setTrue();
        await signOut(auth);
        setUser(null);
        setFalse();
        await deleteSession();
    }

    const enteredCode = code?.join('') ?? '';

    return <Box position="relative" h="100vh" w="full">
        <div id="recaptcha-container" />
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

                    {!user ? (
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
                                                placeholder="+380501234567"
                                                {...register('phoneNumber', {
                                                    setValueAs(value: string) {
                                                        return `+380${value.split(' ').join('')}`
                                                    },
                                                    pattern: {
                                                        value: /^\+380\d{9}$/,
                                                        message: 'Номер телефону має містити 9 цифр',
                                                    },
                                                })}
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
                                                    w="full"
                                                    value={field.value}
                                                    onValueChange={(e) => field.onChange(e.value)}
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
                                        disabled={loading || !phoneNumber || Boolean(conf && enteredCode.length < CODE_LENGTH)}
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
                                disabled={loading}
                            >
                                <BiLogoGoogle />
                                Зайти через Ґуґл
                            </Button>
                        </VStack>
                    ) : (
                        <VStack>
                            <Text>Привіт, {user.phoneNumber ?? user.email}</Text>
                            <Button
                                type="button"
                                onClick={handleLogout}
                                disabled={loading}
                            >
                                Вийти
                            </Button>
                        </VStack>
                    )}
                </VStack>
            </Container>
        </AbsoluteCenter>
    </Box>
}
