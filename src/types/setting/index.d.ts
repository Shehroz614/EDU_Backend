import { Document } from 'mongoose';

interface Setting extends Document {
  name: string;
  value: string;
  isPublic: boolean;
}
export default Setting;
