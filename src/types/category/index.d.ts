import { Document } from 'mongoose';

interface Category extends Document {
  name: { [_key: string]: string };
  parent: this[_id];
  children: this[_id][];
}
export default Category;
