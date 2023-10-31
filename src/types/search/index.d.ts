import { Document } from "mongoose";

interface Search extends Document {
    text: string
};
export default Search
