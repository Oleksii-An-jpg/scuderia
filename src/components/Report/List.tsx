// For browser-only setup with just project ID
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
} from 'firebase/firestore';
import {FC, useEffect} from "react";

const app = initializeApp({
    projectId: "cookbook-460911",
    apiKey: "AIzaSyDjgyzE4AUL_ssOkL791sUBNNBnelljXpM",
});

const db = getFirestore(app);

const roadListsRef = collection(db, 'road-lists');

async function getAllRoadLists() {
    try {
        const querySnapshot = await getDocs(roadListsRef);
        const roadLists: unknown[] = [];

        querySnapshot.forEach((doc) => {
            roadLists.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Found ${roadLists.length} road lists`);
        return { success: true, data: roadLists };
    } catch (error) {
        console.error('Error getting road lists:', error);
        return { success: false, error: error };
    }
}

export const List: FC = () => {
    useEffect(() => {
        getAllRoadLists();
    }, []);
    return <div>List</div>
}
