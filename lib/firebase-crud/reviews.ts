import { firestore } from '@/lib/utils/firebaseConfig';
import { getAuth } from '@react-native-firebase/auth';
import { collection, doc, writeBatch } from '@react-native-firebase/firestore';
import { useTripReviews } from '@/lib/store/useTripReviews';

export const submitTripReview = async (rideId: string) => {
    try {
        const userId = getAuth().currentUser?.uid;
        if (!userId) {
            throw new Error('User not authenticated');
        }

        const review = useTripReviews.getState().reviews[rideId];
        if (!review) {
            throw new Error('No review data found for this trip');
        }

        const batch = writeBatch(firestore);

        // 1. Submit Post-Trip Questionnaire Response
        if (review.postTrip) {
            const postTripRef = doc(firestore, 'postTripQuestionnaire_response', rideId);
            batch.set(postTripRef, {
                rideId: rideId,
                rideId_FK: rideId, // Based on ERD
                arrival: review.postTrip.arrival,
                etaRating: review.postTrip.etaRating,
                stressRating: review.postTrip.stressRating,
                language: review.postTrip.language || 'en',
                submittedAt: Date.now(),
            }, { merge: true }); // Use merge in case of retries
        }

        // 2. Submit route change metadata and responses using the existing Firebase deviation collections.
        if (review.answers && Object.keys(review.answers).length > 0) {
            for (const [deviationId, answer] of Object.entries(review.answers)) {
                    // A. Save the route change metadata itself.
                if (answer.metadata) {
                    const deviationRef = doc(firestore, 'deviations', deviationId);
                    
                    const points = [];
                    if (answer.metadata.gpsLocation) {
                        points.push(answer.metadata.gpsLocation);
                    }

                    batch.set(deviationRef, {
                        deviationId: deviationId,
                        routeId: answer.metadata.routeId ?? null,
                        rideId: rideId,
                        userId: userId,
                        dateTime: answer.metadata.dateTime || Date.now(),
                        isFaster: answer.metadata.isFaster ?? null,
                        gpsLocation: answer.metadata.gpsLocation 
                            ? `${answer.metadata.gpsLocation.latitude},${answer.metadata.gpsLocation.longitude}` 
                            : null,
                        originalRouteEdge: answer.metadata.originalRouteEdge ?? null,
                        deviatedEdge: answer.metadata.deviatedEdge ?? null,
                        streetName: answer.metadata.streetName ?? null,
                        generatedInstruction: answer.metadata.generatedInstruction ?? null,
                        deviationInstruction: answer.metadata.deviationInstruction ?? null,
                        points: points,
                        timestamp: answer.metadata.timestamp ?? Date.now(),
                        createdAt: Date.now(),
                    }, { merge: true });
                }

                // B. Save the route change questionnaire response.
                if (answer.questionnaire) {
                    const deviationResponseRef = doc(collection(firestore, 'deviationResponses'));
                    batch.set(deviationResponseRef, {
                        responseId: deviationResponseRef.id,
                        deviationId: deviationId,
                        rideId: rideId,
                        primaryReason: answer.questionnaire.primaryReason ?? null,
                        primaryReasonOther: answer.questionnaire.primaryReasonOther ?? null,
                        trafficSeverity: answer.questionnaire.trafficSeverity ?? null,
                        rushHourCause: answer.questionnaire.rushHourCause ?? null,
                        chooseDuringNonRush: answer.questionnaire.chooseDuringNonRush ?? null,
                        blockageReason: answer.questionnaire.blockageReason ?? null,
                        blockageReasonOther: answer.questionnaire.blockageReasonOther ?? null,
                        personalStopReason: answer.questionnaire.personalStopReason ?? [],
                        personalStopOther: answer.questionnaire.personalStopOther ?? null,
                        stopDuration: answer.questionnaire.stopDuration ?? null,
                        deviateAgain: answer.affect ?? null,
                        avoidRoadFrequency: answer.questionnaire.avoidRoadFrequency ?? null,
                        usuallyAvoidRoad: answer.confidence ?? null,
                        language: answer.language ?? 'en',
                        submittedAt: Date.now(),
                        createdAt: Date.now(),
                    });
                }
            }
        }

        // Commit all changes atomically
        await batch.commit();

    } catch (error) {
        console.error('Error submitting trip review to Firebase:', error);
        throw error;
    }
};
