"use client";

import {useState, useEffect} from "react";
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
import {AbsoluteCenter, Box, Button, Container, VStack, Alert, Field, Input, Separator, PinInput, Text} from "@chakra-ui/react";
import {useForm, Controller} from "react-hook-form";
import {useBoolean} from "usehooks-ts";
import {BiLogoGoogle} from "react-icons/bi";

type Values = {
    phoneNumber: string;
    code: string[];
}

export default function Auth() {
    const { register, watch, control, setError, reset, clearErrors, handleSubmit, formState: { errors } } = useForm<Values>()
    const [phoneNumber, code] = watch(['phoneNumber', 'code'])
    const [user, setUser] = useState<User | null>(null);
    const [conf, setConf] = useState<ConfirmationResult | null>(null);
    const [verifier, setVerifier] = useState<RecaptchaVerifier | null>(null);
    const { value: loading, setTrue, setFalse } = useBoolean();

    // Initialize invisible reCAPTCHA
    useEffect(() => {
        // Only create verifier if it doesn't exist
        if (!verifier) {
            try {
                const v = new RecaptchaVerifier(auth, "recaptcha-container", {
                    size: "invisible",
                    callback: () => {
                        // reCAPTCHA solved - allow sign in
                        console.log("reCAPTCHA solved");
                    },
                    'expired-callback': () => {
                        // Response expired - reset verifier
                        console.log("reCAPTCHA expired");
                        // setError("reCAPTCHA expired. Please try again.");
                    }
                });
                v.render().then(() => {
                    setVerifier(v)
                }); // Ensure the invisible reCAPTCHA is rendered and ready
            } catch (err) {
                console.error("Error creating RecaptchaVerifier:", err);
                // setError("Failed to initialize reCAPTCHA");
            }
        }

        // Cleanup function
        return () => {
            if (verifier) {
                verifier.clear();
            }
        };
    }, []); // Empty dependency array - only run once

    // Watch Firebase auth
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsub();
    }, []);

    async function handleGoogleLogin() {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken(true);
            await createSession(token);
            setUser(result.user);
        } catch (err) {
            console.error("Google login error:", err);
        }
    }

    async function handleSendCode() {
        if (!verifier) {
            return;
        }

        setTrue();

        try {
            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
            setConf(confirmation);
            clearErrors();
        } catch (err) {
            const error = err as {
                name: string;
                code: string;
            };
            setError('root', {
                type: error.name,
                message: error.code
            });
        } finally {
            setFalse();
        }
    }

    async function handleLogout() {
        setTrue();
        await signOut(auth);
        setUser(null);
        setFalse();
        await deleteSession();
    }

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
                            <form className="w-full">
                                {/* PHONE INPUT */}
                                <VStack align="stretch" gap={4}>
                                    <Field.Root disabled={loading || !!conf} orientation="horizontal">
                                        <Field.Label>Телефон</Field.Label>
                                        <Input
                                            {...register('phoneNumber')}
                                            type="tel"
                                            placeholder="+380..."
                                        />
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
                                        colorPalette="blue"
                                        loading={loading}
                                        loadingText={code ? 'Входимо' : 'Надсилаємо'}
                                        onClick={conf ? handleSubmit(async (data) => {

                                            setTrue();
                                            const result = await conf.confirm(data.code.join(''));
                                            const token = await result.user.getIdToken(true);
                                            await createSession(token);
                                            setUser(result.user);

                                            reset();

                                            setFalse();
                                        }) : handleSendCode}
                                        disabled={loading || !phoneNumber || Boolean(conf && !code)}
                                    >
                                        {conf ? 'Увійти' : "Надіслати код на номер"}
                                    </Button>
                                </VStack>
                            </form>

                            <Separator />

                            <Button
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