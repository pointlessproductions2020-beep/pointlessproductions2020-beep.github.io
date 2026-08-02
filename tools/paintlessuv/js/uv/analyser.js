import * as THREE from "three";


/* =========================================================
   PAINTLESSUV
   UV ANALYSER
========================================================= */


/* =========================================================
   DEFAULT ANALYSIS SETTINGS
========================================================= */

const DEFAULT_OPTIONS = {

  /*
   * UV triangles smaller than this are considered collapsed.
   */

  collapsedAreaThreshold:
    0.00000001,


  /*
   * 3D triangles smaller than this are considered degenerate.
   */

  degenerateAreaThreshold:
    0.0000000001,


  /*
   * A single UV edge longer than this is suspicious.
   *
   * UV coordinates normally occupy the 0–1 texture square,
   * so 0.35 already spans more than one third of the texture.
   */

  longUVEdgeThreshold:
    0.35,


  /*
   * Compares the proportions of the triangle in 3D and UV
   * space. Higher values indicate stronger distortion.
   */

  severeStretchThreshold:
    12,


  /*
   * UV coordinates outside 0–1 by more than this tolerance
   * are marked as outside the texture area.
   */

  boundsTolerance:
    0.0001,


  /*
   * Avoid storing tens of thousands of detailed issue objects.
   * Counts remain accurate even when the detail list is capped.
   */

  maximumStoredIssues:
    500

};


/* =========================================================
   ANALYSE UV LAYOUT
========================================================= */

/**
 * Inspect every UV triangle in a Three.js model.
 *
 * This detects:
 *
 * - missing UV attributes;
 * - collapsed UV triangles;
 * - degenerate 3D triangles;
 * - UV triangles with reversed winding;
 * - UV coordinates outside the 0–1 texture square;
 * - unusually long UV edges;
 * - severe shape distortion between 3D and UV space.
 *
 * It deliberately does not modify the model.
 *
 * @param {THREE.Object3D} modelScene
 * @param {Object} userOptions
 * @returns {Object}
 */
export function analyseUVLayout(
  modelScene,
  userOptions = {}
) {

  if (
    !modelScene
  ) {

    throw new Error(
      "PaintlessUV cannot analyse UVs without a model."
    );

  }


  const options =
    {
      ...DEFAULT_OPTIONS,
      ...userOptions
    };


  const result =
    createEmptyResult();


  modelScene.updateMatrixWorld(
    true
  );


  modelScene.traverse(
    (
      object
    ) => {

      if (
        !object.isMesh ||
        !object.geometry
      ) {

        return;

      }


      analyseMeshUVs(
        object,
        result,
        options
      );

    }
  );


  finaliseResult(
    result
  );


  return result;

}


/* =========================================================
   ANALYSE ONE MESH
========================================================= */

function analyseMeshUVs(
  mesh,
  result,
  options
) {

  const geometry =
    mesh.geometry;

  const position =
    geometry.getAttribute(
      "position"
    );

  const uv =
    geometry.getAttribute(
      "uv"
    );


  result.meshes +=
    1;


  if (
    !position
  ) {

    result.meshesWithoutGeometry +=
      1;


    storeIssue(
      result,
      "missingGeometry",
      {
        meshName:
          getMeshName(
            mesh
          ),

        message:
          "Mesh has no position attribute."
      },
      options
    );


    return;

  }


  if (
    !uv
  ) {

    result.meshesWithoutUV +=
      1;


    storeIssue(
      result,
      "missingUV",
      {
        meshName:
          getMeshName(
            mesh
          ),

        message:
          "Mesh has no UV attribute."
      },
      options
    );


    return;

  }


  result.meshesWithUV +=
    1;


  const index =
    geometry.getIndex();


  if (
    index
  ) {

    analyseIndexedGeometry(
      mesh,
      position,
      uv,
      index,
      result,
      options
    );

  } else {

    analyseNonIndexedGeometry(
      mesh,
      position,
      uv,
      result,
      options
    );

  }

}


/* =========================================================
   INDEXED GEOMETRY
========================================================= */

function analyseIndexedGeometry(
  mesh,
  position,
  uv,
  index,
  result,
  options
) {

  let triangleNumber =
    0;


  for (
    let indexPosition = 0;
    indexPosition + 2 <
      index.count;
    indexPosition += 3
  ) {

    analyseTriangle(
      mesh,
      position,
      uv,
      index.getX(
        indexPosition
      ),
      index.getX(
        indexPosition + 1
      ),
      index.getX(
        indexPosition + 2
      ),
      triangleNumber,
      result,
      options
    );


    triangleNumber +=
      1;

  }

}


/* =========================================================
   NON-INDEXED GEOMETRY
========================================================= */

function analyseNonIndexedGeometry(
  mesh,
  position,
  uv,
  result,
  options
) {

  let triangleNumber =
    0;


  const maximumCount =
    Math.min(
      position.count,
      uv.count
    );


  for (
    let vertexPosition = 0;
    vertexPosition + 2 <
      maximumCount;
    vertexPosition += 3
  ) {

    analyseTriangle(
      mesh,
      position,
      uv,
      vertexPosition,
      vertexPosition + 1,
      vertexPosition + 2,
      triangleNumber,
      result,
      options
    );


    triangleNumber +=
      1;

  }

}


/* =========================================================
   ANALYSE TRIANGLE
========================================================= */

function analyseTriangle(
  mesh,
  position,
  uv,
  indexA,
  indexB,
  indexC,
  triangleNumber,
  result,
  options
) {

  result.triangles +=
    1;


  const point3DA =
    readPosition(
      position,
      indexA
    );

  const point3DB =
    readPosition(
      position,
      indexB
    );

  const point3DC =
    readPosition(
      position,
      indexC
    );


  /*
   * Use world-space positions so scaled models are assessed
   * using their actual displayed dimensions.
   */

  point3DA.applyMatrix4(
    mesh.matrixWorld
  );

  point3DB.applyMatrix4(
    mesh.matrixWorld
  );

  point3DC.applyMatrix4(
    mesh.matrixWorld
  );


  const pointUVA =
    readUV(
      uv,
      indexA
    );

  const pointUVB =
    readUV(
      uv,
      indexB
    );

  const pointUVC =
    readUV(
      uv,
      indexC
    );


  const signedUVArea =
    calculateSignedUVArea(
      pointUVA,
      pointUVB,
      pointUVC
    );

  const absoluteUVArea =
    Math.abs(
      signedUVArea
    ) /
    2;


  const worldArea =
    calculateTriangle3DArea(
      point3DA,
      point3DB,
      point3DC
    );


  const worldEdges =
    calculateEdgeLengths3D(
      point3DA,
      point3DB,
      point3DC
    );

  const uvEdges =
    calculateEdgeLengthsUV(
      pointUVA,
      pointUVB,
      pointUVC
    );


  const longestUVEdge =
    Math.max(
      ...uvEdges
    );


  const shapeDistortion =
    calculateShapeDistortion(
      worldEdges,
      uvEdges
    );


  const outsideBounds =
    triangleOutsideTextureBounds(
      pointUVA,
      pointUVB,
      pointUVC,
      options.boundsTolerance
    );


  const baseIssue =
    {
      meshName:
        getMeshName(
          mesh
        ),

      triangle:
        triangleNumber,

      indices:
        [
          indexA,
          indexB,
          indexC
        ],

      uv:
        [
          serialiseVector2(
            pointUVA
          ),
          serialiseVector2(
            pointUVB
          ),
          serialiseVector2(
            pointUVC
          )
        ],

      signedUVArea,

      uvArea:
        absoluteUVArea,

      worldArea,

      longestUVEdge,

      shapeDistortion
    };


  let healthy =
    true;


  /*
   * Collapsed UV triangle.
   */

  if (
    absoluteUVArea <=
      options.collapsedAreaThreshold
  ) {

    result.collapsedTriangles +=
      1;

    healthy =
      false;


    storeIssue(
      result,
      "collapsed",
      {
        ...baseIssue,

        message:
          "UV triangle has almost no usable area."
      },
      options
    );

  }


  /*
   * Degenerate geometry triangle.
   */

  if (
    worldArea <=
      options.degenerateAreaThreshold
  ) {

    result.degenerateTriangles +=
      1;

    healthy =
      false;


    storeIssue(
      result,
      "degenerate",
      {
        ...baseIssue,

        message:
          "3D triangle has almost no usable area."
      },
      options
    );

  }


  /*
   * UV winding direction.
   *
   * A negative area indicates the UV triangle is wound in the
   * opposite direction. This can represent a mirrored island,
   * but mirrored UVs are not always accidental.
   */

  if (
    signedUVArea <
      -options.collapsedAreaThreshold
  ) {

    result.mirroredTriangles +=
      1;

    healthy =
      false;


    storeIssue(
      result,
      "mirrored",
      {
        ...baseIssue,

        message:
          "UV triangle has reversed winding and may be mirrored."
      },
      options
    );

  }


  /*
   * Coordinates outside the normal texture square.
   */

  if (
    outsideBounds
  ) {

    result.outOfBoundsTriangles +=
      1;

    healthy =
      false;


    storeIssue(
      result,
      "outOfBounds",
      {
        ...baseIssue,

        message:
          "UV triangle extends outside the 0–1 texture area."
      },
      options
    );

  }


  /*
   * Very long UV edges commonly appear as the large diagonal
   * lines visible across the UV panel.
   */

  if (
    longestUVEdge >=
      options.longUVEdgeThreshold
  ) {

    result.longEdgeTriangles +=
      1;

    healthy =
      false;


    storeIssue(
      result,
      "longEdges",
      {
        ...baseIssue,

        message:
          "UV triangle contains an unusually long edge."
      },
      options
    );

  }


  /*
   * Compare the triangle's proportions in world and UV space.
   */

  if (
    Number.isFinite(
      shapeDistortion
    ) &&
    shapeDistortion >=
      options.severeStretchThreshold
  ) {

    result.severelyStretchedTriangles +=
      1;

    healthy =
      false;


    storeIssue(
      result,
      "stretched",
      {
        ...baseIssue,

        message:
          "Triangle shape is severely distorted in UV space."
      },
      options
    );

  }


  if (
    healthy
  ) {

    result.healthyTriangles +=
      1;

  }

}


/* =========================================================
   UV AREA
========================================================= */

function calculateSignedUVArea(
  pointA,
  pointB,
  pointC
) {

  return (
    (
      pointB.x -
      pointA.x
    ) *
    (
      pointC.y -
      pointA.y
    )
  ) -
  (
    (
      pointB.y -
      pointA.y
    ) *
    (
      pointC.x -
      pointA.x
    )
  );

}


/* =========================================================
   3D AREA
========================================================= */

function calculateTriangle3DArea(
  pointA,
  pointB,
  pointC
) {

  const edgeAB =
    new THREE.Vector3()
      .subVectors(
        pointB,
        pointA
      );

  const edgeAC =
    new THREE.Vector3()
      .subVectors(
        pointC,
        pointA
      );


  return edgeAB
    .cross(
      edgeAC
    )
    .length() /
    2;

}


/* =========================================================
   EDGE LENGTHS
========================================================= */

function calculateEdgeLengths3D(
  pointA,
  pointB,
  pointC
) {

  return [
    pointA.distanceTo(
      pointB
    ),

    pointB.distanceTo(
      pointC
    ),

    pointC.distanceTo(
      pointA
    )
  ];

}


function calculateEdgeLengthsUV(
  pointA,
  pointB,
  pointC
) {

  return [
    pointA.distanceTo(
      pointB
    ),

    pointB.distanceTo(
      pointC
    ),

    pointC.distanceTo(
      pointA
    )
  ];

}


/* =========================================================
   SHAPE DISTORTION
========================================================= */

/**
 * Compare the proportions of a triangle in 3D and UV space.
 *
 * Uniform scaling does not count as distortion. We normalise
 * both sets of edge lengths by their longest edge, then compare
 * their relative proportions.
 *
 * A value near 1 means the shape is similar.
 * Larger values indicate stronger distortion.
 */
function calculateShapeDistortion(
  worldEdges,
  uvEdges
) {

  const longestWorldEdge =
    Math.max(
      ...worldEdges
    );

  const longestUVEdge =
    Math.max(
      ...uvEdges
    );


  if (
    longestWorldEdge <=
      Number.EPSILON ||
    longestUVEdge <=
      Number.EPSILON
  ) {

    return Infinity;

  }


  const normalisedWorldEdges =
    worldEdges
      .map(
        (
          edge
        ) =>
          edge /
          longestWorldEdge
      )
      .sort(
        (
          a,
          b
        ) =>
          a - b
      );

  const normalisedUVEdges =
    uvEdges
      .map(
        (
          edge
        ) =>
          edge /
          longestUVEdge
      )
      .sort(
        (
          a,
          b
        ) =>
          a - b
      );


  let maximumRatio =
    1;


  for (
    let position = 0;
    position <
      normalisedWorldEdges.length;
    position += 1
  ) {

    const worldValue =
      Math.max(
        normalisedWorldEdges[
          position
        ],
        Number.EPSILON
      );

    const uvValue =
      Math.max(
        normalisedUVEdges[
          position
        ],
        Number.EPSILON
      );


    const ratio =
      Math.max(
        worldValue /
          uvValue,
        uvValue /
          worldValue
      );


    maximumRatio =
      Math.max(
        maximumRatio,
        ratio
      );

  }


  return maximumRatio;

}


/* =========================================================
   TEXTURE BOUNDS
========================================================= */

function triangleOutsideTextureBounds(
  pointA,
  pointB,
  pointC,
  tolerance
) {

  return [
    pointA,
    pointB,
    pointC
  ]
    .some(
      (
        point
      ) =>
        point.x <
          -tolerance ||
        point.x >
          1 +
          tolerance ||
        point.y <
          -tolerance ||
        point.y >
          1 +
          tolerance
    );

}


/* =========================================================
   ATTRIBUTE READERS
========================================================= */

function readPosition(
  position,
  index
) {

  return new THREE.Vector3(
    position.getX(
      index
    ),
    position.getY(
      index
    ),
    position.getZ(
      index
    )
  );

}


function readUV(
  uv,
  index
) {

  return new THREE.Vector2(
    uv.getX(
      index
    ),
    uv.getY(
      index
    )
  );

}


/* =========================================================
   RESULT CREATION
========================================================= */

function createEmptyResult() {

  return {

    meshes:
      0,

    meshesWithUV:
      0,

    meshesWithoutUV:
      0,

    meshesWithoutGeometry:
      0,

    triangles:
      0,

    healthyTriangles:
      0,

    collapsedTriangles:
      0,

    degenerateTriangles:
      0,

    mirroredTriangles:
      0,

    outOfBoundsTriangles:
      0,

    longEdgeTriangles:
      0,

    severelyStretchedTriangles:
      0,

    issueCount:
      0,

    storedIssueCount:
      0,

    hasUV:
      false,

    hasProblems:
      false,

    issues:
      {

        missingGeometry:
          [],

        missingUV:
          [],

        collapsed:
          [],

        degenerate:
          [],

        mirrored:
          [],

        outOfBounds:
          [],

        longEdges:
          [],

        stretched:
          []

      }

  };

}


/* =========================================================
   STORE ISSUE
========================================================= */

function storeIssue(
  result,
  category,
  issue,
  options
) {

  result.issueCount +=
    1;


  const destination =
    result.issues[
      category
    ];


  if (
    !destination
  ) {

    return;

  }


  if (
    result.storedIssueCount >=
      options.maximumStoredIssues
  ) {

    return;

  }


  destination.push(
    issue
  );


  result.storedIssueCount +=
    1;

}


/* =========================================================
   FINALISE RESULT
========================================================= */

function finaliseResult(
  result
) {

  result.hasUV =
    result.meshesWithUV >
    0;


  result.hasProblems =
    Boolean(
      result.meshesWithoutUV >
        0 ||
      result.meshesWithoutGeometry >
        0 ||
      result.collapsedTriangles >
        0 ||
      result.degenerateTriangles >
        0 ||
      result.outOfBoundsTriangles >
        0 ||
      result.longEdgeTriangles >
        0 ||
      result.severelyStretchedTriangles >
        0
    );


  result.summary =
    createSummary(
      result
    );

}


/* =========================================================
   SUMMARY
========================================================= */

function createSummary(
  result
) {

  return {

    status:
      result.hasProblems
        ? "warning"
        : "good",

    message:
      result.hasProblems
        ? "UV issues were detected."
        : "UV layout appears healthy.",

    healthy:
      result.healthyTriangles,

    collapsed:
      result.collapsedTriangles,

    degenerate:
      result.degenerateTriangles,

    mirrored:
      result.mirroredTriangles,

    outsideBounds:
      result.outOfBoundsTriangles,

    longEdges:
      result.longEdgeTriangles,

    severelyStretched:
      result.severelyStretchedTriangles

  };

}


/* =========================================================
   HELPERS
========================================================= */

function getMeshName(
  mesh
) {

  return mesh.name ||
    mesh.parent?.name ||
    "Unnamed Mesh";

}


function serialiseVector2(
  vector
) {

  return {
    x:
      vector.x,

    y:
      vector.y
  };

}
