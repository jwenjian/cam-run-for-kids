// 计算数组平均值
export function average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// 计算关节角度
export function getAngle(a, b, c) {
    if (!a || !b || !c) return 0;

    // 将点转换为向量
    const ab = {
        x: b.x - a.x,
        y: b.y - a.y,
        z: b.z - a.z
    };

    const bc = {
        x: c.x - b.x,
        y: c.y - b.y,
        z: c.z - b.z
    };

    // 计算向量的点积
    const dotProduct = ab.x * bc.x + ab.y * bc.y + ab.z * bc.z;

    // 计算向量的模
    const magnitudeAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z);
    const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

    // 计算角度（弧度）
    const angle = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));

    // 转换为角度
    return angle * (180 / Math.PI);
}
