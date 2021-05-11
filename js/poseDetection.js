//JavaScript code for pose detection
/*TODO:
- Refine squat pose
- Add new poses
- Perhaps some noise suppression by averaging over keypoints?
*/
const storedKeypoints = 5; //Number of keypoints stored for each person
const error = 20; //Margin for how close a pose needs to be to count. In degrees
const tickFade = 20; //Number of ticks before a person ID is removed (I'm not sure how noisy people existence is, so I'm doing this to hold on to them for a bit longer. Probably not necessary?)
const poseData = { //Angles for each of the exercises. Each set of angles represents the required joint positions to meet that stage of the exercise. If a joint doesn't exist, the pose does not care about that joint (ex: arms do not matter for squatting)
    squat: [
        {
            lHip: 160,
            rHip: 160,
            lKnee: 140,
            rKnee: 140,
        },
        {
            lHip: 120,
            rHip: 120,
            lKnee: 105,
            rKnee: 105,
        }
    ],
    jumpingjack: [
        {
            lElbow: 170,
            rElbow: 170,
            lShoulder: 20,
            rShoulder: 20,
            lHip: 160,
            rHip: 160,
            lKnee: 140,
            rKnee: 140,
        },
        {
            lElbow: 140, 
            rElbow: 140, 
            lShoulder: 75,
            rShoulder: 75,
            lHip: 150,
            rHip: 150,
            lKnee: 140, 
            rKnee: 140, 
        }
    ]
}
const blankKeypoints = {
    Nose: null,
    LEye: null,
    REye: null,
    LEar: null,
    REar: null,
    LShoulder: null,
    RShoulder: null,
    LElbow: null,
    RElbow: null,
    LWrist: null,
    RWrist: null,
    LHip: null,
    RHip: null,
    LKnee: null,
    RKnee: null,
    LAnkle: null,
    RAnkle: null,
}
var count = {};
var maxCount = {
    squat: 0,
    //pushup: 0,
    //situp: 0,
    jumpingjack: 0,
};
const handleData = (data) => { //Called by main, where the connection to the socket is made
    if(data.people){
        for(let personID in data.people){ //Cycles through each visible person
            handlePerson(data.people[personID]);
        }
    }
    for(let personID in count){ //Removes people if necessary
        count[personID].tickFade--;
        if(count[personID].tickFade == 0){
            console.log(`Deleting ${personID}`);
            delete(count[personID]);
        }
    }
}
const handlePerson = (person) => {
    if(!count[person.idx]){ //Checks if person exists in the count dictionary yet, if not, adds them
        count[person.idx] = {
            tickFade: tickFade,
            keypoints: [],
            smoothedKeypoints: blankKeypoints,
        }
        for(let i = 0; i < storedKeypoints; i++){
            count[person.idx].keypoints[i] = null;
        }
        for(let poseKey in poseData){ //Initializes each of the available exercises to keep track
            count[person.idx][poseKey] = {
                count: 0,
                lastPosition: -1,
            }
        }
        //console.log(`Added new person ${person.idx}`);
    }
    for(let i = 0; i < storedKeypoints-1; i++){
        count[person.idx].keypoints[i+1] = count[person.idx].keypoints[i];
    }
    count[person.idx].keypoints[0] = person.keypoints;
    for(let point in count[person.idx].smoothedKeypoints){
        let usableData = [];
        for(let i = 0; i < storedKeypoints; i++){
            if(count[person.idx].keypoints[i][point]){
                usableData.push(count[person.idx].keypoints[i][point]);
            }
        }
        let weightedData = [0,0,0];
        let avgDenominator = 0;
        for(let i = 0; i < usableData.length; i++){
            for(let j = 0; j <= 3; j++){
                weightedData[j] += Math.pow(usableData.length-i, 2)*usableData[i][j]; //Weighting factor so most recent ones matter more
            }
            avgDenominator += Math.pow(usableData.length-i, 2);
        }
        for(let j = 0; j <= 3; j++){
            weightedData[j] /= avgDenominator;
        }
        count[person.idx].smoothedKeypoints[point] = weightedData;
    }
    count[person.idx].tickFade = Object.assign(tickFade); //Resets the tickFade for all the people in frame
    //Updating keypoints of person
    const joints = { //Calculates all the angles (null joint if a keypoint doesn't exist)
        lElbow: calculateAngle(count[person.idx].smoothedKeypoints.LElbow, count[person.idx].smoothedKeypoints.LWrist, count[person.idx].smoothedKeypoints.LShoulder), 
        rElbow: calculateAngle(count[person.idx].smoothedKeypoints.RElbow, count[person.idx].smoothedKeypoints.RWrist, count[person.idx].smoothedKeypoints.RShoulder),
        lShoulder: calculateAngle(count[person.idx].smoothedKeypoints.LShoulder, count[person.idx].smoothedKeypoints.LElbow, count[person.idx].smoothedKeypoints.LHip),
        rShoulder: calculateAngle(count[person.idx].smoothedKeypoints.RShoulder, count[person.idx].smoothedKeypoints.RElbow, count[person.idx].smoothedKeypoints.RHip),
        lHip: calculateAngle(count[person.idx].smoothedKeypoints.LHip, count[person.idx].smoothedKeypoints.LShoulder, count[person.idx].smoothedKeypoints.LKnee),
        rHip: calculateAngle(count[person.idx].smoothedKeypoints.RHip, count[person.idx].smoothedKeypoints.RShoulder, count[person.idx].smoothedKeypoints.RKnee),
        lKnee: calculateAngle(count[person.idx].smoothedKeypoints.LKnee, count[person.idx].smoothedKeypoints.LHip, count[person.idx].smoothedKeypoints.LAnkle),
        rKnee: calculateAngle(count[person.idx].smoothedKeypoints.RKnee, count[person.idx].smoothedKeypoints.RHip, count[person.idx].smoothedKeypoints.RAnkle),
    };
    console.log(joints)
    for(let poseKey in poseData){ //Iterates through each exercise and each pose in that exercise
        for(let poseStage = 0; poseStage < poseData[poseKey].length; poseStage++){ //Iterating through each pose in the exercise
            let matchPose = true; //Assumes matches until it's not
            for(let jointKey in poseData[poseKey][poseStage]){ //Iterating through each joint in the pose
                let jointAngle = poseData[poseKey][poseStage][jointKey]; //Goal joint angle
                if(!joints[jointKey] || Math.abs(jointAngle-joints[jointKey]) > error){ //If this joint isn't detected on the person or it's too far, the pose does not match
                    matchPose = false;
                }
            }
            if(matchPose){ //Triggers if all conditions of a specific pose are met
                let countPose = count[person.idx][poseKey];
                if(poseStage == 0 && countPose.lastPosition == poseData[poseKey].length-1){ //Handling the last pose to the first (one completed exercise)
                    countPose.lastPosition = 0;
                    countPose.count++;
                    if(countPose.count > maxCount[poseKey]){
                        maxCount[poseKey] = countPose.count;
                    }
                    //Function call to update leaderboard goes here
                }
                else if(poseStage == countPose.lastPosition+1){ //Person has succeeded one stage and must complete next
                    countPose.lastPosition = poseStage;
                }
                console.log(`${person.idx}: Pose ${poseKey}[${poseStage}] match. Count: ${count[person.idx][poseKey].count}`);
            }
        }
    }
}
const calculateAngle = (midpoint, endpoint1, endpoint2) => { //In degrees. Calculates angle created by the 3 points
    if(!midpoint || !endpoint1 || !endpoint2){ return null; }
    let v1 = getVector(endpoint1, midpoint);
    let v2 = getVector(endpoint2, midpoint);
    return (180 / Math.PI) * Math.acos(getDotProduct(v1, v2) / (getMagnitude(v1)*getMagnitude(v2))); //Based on: a dot b = |a||b|cos(angle)
}
const getDotProduct = (vector1, vector2) => {
    return vector1[0]*vector2[0]+vector1[1]*vector2[1]+vector1[2]*vector2[2];
}
const getVector = (point1, point2) => { //Formatted as [x, y, z]
    return [point2[0]-point1[0], point2[1]-point1[1], point2[2]-point1[2]];
}
const getMagnitude = (vector) => {
    return Math.sqrt(vector[0]*vector[0]+vector[1]*vector[1]+vector[2]*vector[2]);
}