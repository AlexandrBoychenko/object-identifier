export type BXBlock = {
  id?: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  object_percentage: number;
};

export type IdentifierObject = {
  height: number;
  width: number;
  object_image: {
    data: string;
  };
  bx_block_objectidentifier2_objects_attributes: BXBlock[] | [];
};

export type EditObject = {
  id: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  object_percentage: number;
  objectidentifier_id?: number;
};

export type ReceivedImages = {
  id?: number;
  attributes: {
    id: number;
    object_image: string;
    height: number;
    width: number;
    bx_block_objectidentifier2_objects: EditObject[];
    total_count: number;
  };
};

export type Detection = {
  labelIndex?: number;
  score?: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DetectedObject =
  | Uint8Array<ArrayBufferLike>
  | Float32Array<ArrayBufferLike>
  | Int32Array<ArrayBufferLike>;
